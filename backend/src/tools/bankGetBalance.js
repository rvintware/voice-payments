import { z } from 'zod';

const Args = z.object({ account: z.string().default('main') });
const Result = z.object({ available_cents: z.number().nonnegative() });

/** @type {Tool<typeof Args, typeof Result>} */
export const bankGetBalance = {
  name: 'bank_getBalance',
  description: 'Get CAD available balance',
  argsSchema: Args,
  resultSchema: Result,
  async run() {
    const res = await fetch('http://localhost:4000/api/balance');
    if (!res.ok) throw new Error('balance_fetch_failed');
    const json = await res.json();
    return { available_cents: json.availableCents };
  },
}; 