import { z } from 'zod';

const Friend = z.object({ name: z.string().min(1), email: z.string().email() });
const Args = z.object({
  total_cents: z.number().positive().max(100_000),
  currency: z.string().default('usd'),
  friends: z.array(Friend).min(1).max(10),
});
const Link = z.object({
  url: z.string().url(),
  name: z.string(),
  amount_cents: z.number(),
  currency: z.string(),
});
const Result = z.object({ links: z.array(Link) });

/** @type {Tool<typeof Args, typeof Result>} */
export const splitBill = {
  name: 'split_bill',
  description: 'Split a total amount evenly between friends and return payment links',
  argsSchema: Args,
  resultSchema: Result,
  async run({ total_cents, currency, friends }) {
    const res = await fetch('http://localhost:4000/api/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_cents, currency, friends }),
    });
    if (!res.ok) throw new Error('split_failed');
    const json = await res.json();
    return { links: json.links };
  },
}; 