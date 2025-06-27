import { z } from 'zod';

// Accept a balance "type" so the model can request available, pending or both.
const Args = z.object({
  type: z.enum(['available', 'pending', 'both']).default('available'),
});

// Only the requested fields are returned; others stay undefined.
const Result = z.object({
  available_cents: z.number().nonnegative().optional(),
  pending_cents: z.number().nonnegative().optional(),
  ok: z.boolean(),
});

/** @type {Tool<typeof Args, typeof Result>} */
export const bankGetBalance = {
  name: 'bank_getBalance',
  // Description doubles as the model's inline API doc – be explicit about args.
  description:
    'Get CAD balance in cents. Call with {"type":"available|pending|both"}.',
  argsSchema: Args,
  resultSchema: Result,
  /**
   * @param {{ type:"available"|"pending"|"both" }} args
   */
  async run({ type }) {
    try {
      const res = await fetch('http://localhost:4000/api/balance');
      if (res.ok) {
        const json = await res.json();
        const out = { ok: true };
        if (type !== 'pending') out.available_cents = json.availableCents;
        if (type !== 'available') out.pending_cents = json.pendingCents;
        return out;
      }
    } catch (_) {
      /* network/Stripe down – ignore */
    }
    return { ok: false };
  },
}; 