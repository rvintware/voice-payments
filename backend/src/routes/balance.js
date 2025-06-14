import { Router } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
const router = Router();

router.get('/balance', async (_req, res) => {
  try {
    const bal = await stripe.balance.retrieve();
    const sum = (arr) =>
      arr.filter((b) => b.currency === 'cad').reduce((s, b) => s + b.amount, 0);

    const availableCents = sum(bal.available);
    const pendingCents = sum(bal.pending);

    res.json({ availableCents, pendingCents });
  } catch (err) {
    console.error('Balance error', err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router; 