import { Router } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
const router = Router();

router.get('/balance', async (_req, res) => {
  try {
    const bal = await stripe.balance.retrieve();
    // Sum amounts for Canadian dollars (CAD). In test mode Stripe uses CAD so we focus on that
    const available = bal.available.filter(b=>b.currency==='cad').reduce((s,b)=>s+b.amount,0);
    const pending = bal.pending.filter(b=>b.currency==='cad').reduce((s,b)=>s+b.amount,0);
    res.json({ availableCents: available, pendingCents: pending });
  } catch (err) {
    console.error('Balance error', err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router; 