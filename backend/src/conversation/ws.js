import { WebSocketServer } from 'ws';
import { getFsm } from './fsm.js';

/**
 * Attaches a basic WebSocket server for the interruptions MVP. The socket
 * echoes a hello message on connect and replies `pong` to any `{type:'ping'}`
 * message. Further conversation‐related routing will be layered on later.
 * @param {import('http').Server} httpServer Node HTTP server instance
 */
export function attachWS(httpServer) {
  // eslint-disable-next-line no-console
  console.log('### WS helper reloaded', Date.now());
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/session' });
  globalThis.__wss = wss; // expose for other modules

  // Simple per-session buffer so that FSM events generated while a socket is
  // reconnecting are not lost. Maps sessionId → Array<{type, payload}>.
  const pendingBySession = new Map();

  wss.on('connection', (ws) => {
    // Derive a stable session id from the client IP so that HTTP and WS paths share the same key.
    const sessionId = ws._socket.remoteAddress;

    // Flush any messages that were queued while there was no open socket.
    const backlog = pendingBySession.get(sessionId);
    if (Array.isArray(backlog) && backlog.length) {
      backlog.forEach(({ type, payload }) => {
        if (ws.readyState === 1) {
          // eslint-disable-next-line no-console
          console.debug('[WS flush]', type);
          ws.send(JSON.stringify({ type, ...payload }));
        }
      });
      backlog.length = 0; // keep the same array instance but clear it
    }

    // Send a hello handshake that echoes the sessionId so the browser can attach it to future requests if needed.
    ws.send(JSON.stringify({ type: 'hello', sessionId, ts: Date.now() }));

    const fsm = getFsm(sessionId, async (eventType, payload) => {
      // Buffered emitter: if the socket is open, deliver immediately, else queue.
      if (ws.readyState === 1) {
        // eslint-disable-next-line no-console
        console.debug('[WS out]', eventType, { rs: ws.readyState });
        ws.send(JSON.stringify({ type: eventType, ...payload }));
      } else {
        let arr = pendingBySession.get(sessionId);
        if (!arr) {
          arr = [];
          pendingBySession.set(sessionId, arr);
        }
        arr.push({ type: eventType, payload });
        // eslint-disable-next-line no-console
        console.debug('[WS buffer]', eventType, { rs: ws.readyState, queued: arr.length });
      }

      // Handle side-effects that require server resources
      if (eventType === 'payment_confirmed') {
        try {
          // payload should carry amountCents & recipientEmail stored earlier in context – placeholder for now
          const resp = await fetch('http://localhost:4000/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountCents: fsm.context?.amountCents, recipientEmail: fsm.context?.recipientEmail })
          });
          const json = await resp.json();
          const sentence = 'Payment link generated. I have copied it to your clipboard.';
          // send back sentence to client to speak
          ws.send(JSON.stringify({ type: 'speak_sentence', sentence, url: json.url }));
        } catch (err) {
          console.error('payment route error', err);
          ws.send(JSON.stringify({ type: 'error', error: 'payment_failed' }));
        }
      }
    });

    // No ASRProxy required.
    let asr = null;

    ws.on('message', (data, isBinary) => {
      // We no longer expect binary audio frames. Ignore if received.
      if (isBinary || data instanceof Buffer) return;

      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } else if (msg.type === 'vad_interrupt') {
          // USER_INTERRUPT event to FSM and broadcast pause_audio immediately
          fsm.send('USER_INTERRUPT');
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({ type: 'pause_audio' }));
            }
          });
        }
      } catch {
        // ignore malformed JSON/binary
      }
    });

    ws.on('close', () => {
      // Nothing to clean up; the buffer stays until next reconnect.
    });
  });

  // eslint-disable-next-line no-console
  console.log('WebSocket layer attached at ws://localhost:4000/ws/session');
}

// Helper so HTTP routes can notify all clients without importing the WSS instance
export function broadcastPauseAudio() {
  const wss = globalThis.__wss;
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'pause_audio' }));
    }
  });
} 