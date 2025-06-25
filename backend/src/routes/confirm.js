import { Router } from 'express';
import { peekFsm, aliasFsm, getFsm } from '../conversation/fsm.js';
import { stripeCreateCheckout } from '../tools/stripeCreateCheckout.js';
import { splitBill } from '../tools/splitBill.js';
import { parseYesNo } from '../utils/parser.js';
import { normalizeFriends } from '../utils/friendHelpers.js';

const router = Router();

// POST /api/confirm { sessionId?, answer:"yes"|"no" }
router.post('/confirm', async (req, res) => {
  try {
    const { answer } = req.body || {};
    const wsId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;
    const ipKey = req.ip;
    if (!answer || typeof answer !== 'string') {
      return res.status(400).json({ error: 'answer_required' });
    }

    // Allow punctuation like "yes." or phrases like "yes please"
    const decision = parseYesNo(answer);
    if (!decision) {
      return res.json({ speak: 'Please say yes to continue or no to cancel.', ui: 'confirm' });
    }
    const positive = decision === 'yes';
    const negative = decision === 'no';

    // Prefer FSM keyed by the WebSocket sessionId (if provided) but gracefully
    // fall back to the IP-keyed FSM whenever the WS id has not yet been
    // associated. This covers the race where HTTP arrives before the WS handshake.

    let fsm = wsId ? peekFsm(wsId) : null;
    let foundVia = null;

    if (fsm && fsm.state === 'ConfirmWait') foundVia = 'wsId';

    if (!fsm || fsm.state !== 'ConfirmWait') {
      const ipFsm = peekFsm(ipKey);
      if (ipFsm && ipFsm.state === 'ConfirmWait') {
        fsm = ipFsm;
        // Permanently alias the wsId (if any) to this existing FSM so that
        // subsequent calls use the canonical id.
        if (wsId) aliasFsm(wsId, ipFsm);
        foundVia = 'ipKey';
      }
    }

    // If still no suitable FSM, abort.
    // eslint-disable-next-line no-console
    console.debug('[CONFIRM]', {
      wsId,
      ipKey,
      foundVia,
      fsmState: fsm ? fsm.state : 'none',
    });

    if (!fsm || fsm.state !== 'ConfirmWait') {
      return res.status(409).json({ error: 'no_pending_confirmation' });
    }

    const args = fsm.context.pendingArgs || {};
    // eslint-disable-next-line no-console
    console.debug('[CONFIRM args]', JSON.stringify(args));

    // Harmonise split-bill parameters so they always satisfy Zod schema.
    if (Array.isArray(args.friends) && args.friends.length) {
      args.friends = normalizeFriends(args.friends);
      // Older agent versions used amount_cents instead of total_cents
      if (args.amount_cents && !args.total_cents) {
        args.total_cents = args.amount_cents;
        delete args.amount_cents;
      }
      // Ensure currency present
      if (!args.currency) args.currency = 'usd';
    }

    const sessionKey = wsId || ipKey;

    if (negative) {
      fsm._transition?.('Idle'); // rudimentary reset
      fsm.emit('confirm_cancelled');
      return res.json({ speak: 'Okay, cancelled.', ui: 'none' });
    }

    // positive path – choose which tool to run deterministically
    let observation;
    if (Array.isArray(args.friends) && args.friends.length) {
      observation = await splitBill.run(args, { sessionId: sessionKey });
    } else {
      observation = await stripeCreateCheckout.run(args, { sessionId: sessionKey });
    }

    // Before we emit make sure the FSM has a *real* WebSocket emitter.
    if (fsm.emit === undefined || fsm.emit.toString().includes('noop')) {
      const wss = globalThis.__wss;
      if (wss) {
        const live = [...wss.clients].find(
          (c) => c._socket?.remoteAddress === sessionKey && c.readyState === 1,
        );
        if (live) {
          const realEmit = (type, payload = {}) => {
            if (live.readyState === 1) {
              live.send(JSON.stringify({ type, ...payload }));
            }
          };
          // Upgrade and re-fetch so that subsequent logic uses the new emitter
          fsm = getFsm(sessionKey, realEmit);
          // eslint-disable-next-line no-console
          console.debug('[CONFIRM upgrade] emitter attached for', sessionKey);
        }
      }
    }

    // Tell client via WS and reply HTTP ack
    // eslint-disable-next-line no-console
    console.debug('[CONFIRM yes]', {
      sessionKey,
      emitterExists: typeof fsm.emit === 'function',
    });
    const sentence = Array.isArray(observation.links)
      ? 'I have created the payment links and copied them to your clipboard.'
      : 'Payment link generated and copied to your clipboard.';
    fsm.emit('speak_sentence', { sentence, ...observation });
    fsm._transition?.('Idle');
    return res.json({ ok: true, speak: sentence, ...observation });
  } catch (err) {
    console.error('confirm route error', err);
    return res.status(500).json({ error: 'confirm_failed' });
  }
});

export default router; 