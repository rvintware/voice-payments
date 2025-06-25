import { z } from 'zod';
import { getFsm } from '../conversation/fsm.js';

const Args = z.object({
  sentence: z.string().max(400),
  amount_cents: z.number().positive().max(100_000).optional(),
  recipient_email: z.string().email().optional(),
  friends: z.array(z.string().email()).optional(),
});
const Result = z.object({ ok: z.literal(true) });

/** @type {Tool<typeof Args, typeof Result>} */
export const fsmTriggerConfirmRequest = {
  name: 'fsm_triggerConfirmRequest',
  description: 'Ask the user to confirm a money action',
  argsSchema: Args,
  resultSchema: Result,
  async run(args, ctx) {
    const { sentence } = args;
    const fsm = getFsm(ctx.sessionId, () => {});
    // Persist full args so the follow-up /confirm route can access them deterministically.
    fsm.context.pendingArgs = args;
    fsm.send({ type: 'GPT_RESULT', risk: 'money', sentence });
    return { ok: true };
  },
}; 