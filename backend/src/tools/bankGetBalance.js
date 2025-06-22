import { z } from 'zod';

const Args = z.object({ account: z.string().default('main') });
const Result = z.object({
  available_cents: z.number().nonnegative(),
  ok: z.boolean(),
});

/** @type {Tool<typeof Args, typeof Result>} */
export const bankGetBalance = {
  name: 'bank_getBalance',
  description: 'Get CAD available balance',
  argsSchema: Args,
  resultSchema: Result,
  async run() {
    try {
      const res = await fetch('http://localhost:4000/api/balance');
      if (res.ok) {
        const json = await res.json();
        return { available_cents: json.availableCents, ok: true };
      }
    } catch (_) {
      /* network/Stripe down – ignore */
    }
    // Graceful fallback; lets the agent reply deterministically
    return { available_cents: 0, ok: false };
  },
}; 