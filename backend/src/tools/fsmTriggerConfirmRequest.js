import { z } from 'zod';
import { getFsm } from '../conversation/fsm.js';

const Args = z.object({ sentence: z.string().max(400) });
const Result = z.object({ ok: z.literal(true) });

/** @type {Tool<typeof Args, typeof Result>} */
export const fsmTriggerConfirmRequest = {
  name: 'fsm_triggerConfirmRequest',
  description: 'Ask the user to confirm a money action',
  argsSchema: Args,
  resultSchema: Result,
  async run({ sentence }, ctx) {
    const fsm = getFsm(ctx.sessionId, () => {});
    fsm.send({ type: 'GPT_RESULT', risk: 'money', sentence });
    return { ok: true };
  },
}; 