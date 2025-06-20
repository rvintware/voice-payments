import { z } from 'zod';
import { getFsm } from '../conversation/fsm.js';

const Args = z.object({ session_id: z.string(), sentence: z.string().max(200) });
const Result = z.object({ ok: z.literal(true) });

/** @type {Tool<typeof Args, typeof Result>} */
export const fsmTriggerConfirmRequest = {
  name: 'fsm_triggerConfirmRequest',
  description: 'Ask the user to confirm a money action',
  argsSchema: Args,
  resultSchema: Result,
  async run({ session_id, sentence }) {
    const fsm = getFsm(session_id, () => {});
    fsm.send({ type: 'GPT_RESULT', risk: 'money', sentence });
    return { ok: true };
  },
}; 