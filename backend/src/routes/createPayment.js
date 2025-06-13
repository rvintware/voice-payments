import { Router } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

const router = Router();

// Hard-coded preset for PoC
const PRESET = {
  recipient: 'rehvishwanath@gmail.com',
  amount: 2000, // in cents = $20.00
  currency: 'usd',
};

router.post('/create-payment', async (req, res) => {
  try {
    const { amountCents } = req.body || {};

    if (!amountCents || Number.isNaN(Number(amountCents))) {
      return res.status(400).json({ error: 'amountCents required' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: PRESET.currency,
            product_data: {
              name: `Payment to ${PRESET.recipient}`,
            },
            unit_amount: Number(amountCents),
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        recipient: PRESET.recipient,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;
