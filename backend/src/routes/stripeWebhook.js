import express from 'express';
import Stripe from 'stripe';
import db from '../utils/db.js';

const router = express.Router();

// Lazily-initialised Stripe client – ensures dotenv has loaded before we read env vars
let stripeClient; // will be set on first request

router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  // Initialise the client & signing secret at request time
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2023-10-16',
    });
  }
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type.startsWith('payment_intent.')) {
    const pi = event.data.object;
    // UPSERT into DB
    const stmt = db.prepare(`INSERT INTO payments (id, amount, currency, status, description, card_brand, last4, created_at, updated_at)
      VALUES (@id, @amount, @currency, @status, @description, @card_brand, @last4, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, status=excluded.status, description=excluded.description, updated_at=excluded.updated_at`);
    stmt.run({
      id: pi.id,
      amount: pi.amount_received ?? pi.amount,
      currency: pi.currency,
      status: pi.status,
      description: pi.description ?? '',
      card_brand: pi.charges?.data[0]?.payment_method_details?.card?.brand ?? '',
      last4: pi.charges?.data[0]?.payment_method_details?.card?.last4 ?? '',
      created_at: new Date(pi.created * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  res.json({ received: true });
});

export default router; 