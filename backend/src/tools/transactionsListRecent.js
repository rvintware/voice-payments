import { z } from 'zod';

const Args = z.object({ limit: z.number().int().positive().max(20).default(5) });
const Row = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  customer_email: z.string().nullable(),
  created_at: z.string(),
});
const Result = z.object({ transactions: z.array(Row) });

/** @type {Tool<typeof Args, typeof Result>} */
export const transactionsListRecent = {
  name: 'transactions_listRecent',
  description: 'Return the most recent payment transactions',
  argsSchema: Args,
  resultSchema: Result,
  async run({ limit }) {
    const url = `http://localhost:4000/api/transactions?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('tx_fetch_failed');
    const json = await res.json();
    return { transactions: json.transactions || [] };
  },
}; 