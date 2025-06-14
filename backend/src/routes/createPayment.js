import { Router } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

const router = Router();

router.post('/create-payment', async (req, res) => {
  try {
    const { amountCents, recipientEmail } = req.body || {};

    if (!amountCents || Number.isNaN(Number(amountCents))) {
      return res.status(400).json({ error: 'amountCents required' });
    }
    const email = recipientEmail || 'unknown@gmail.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Payment to ${email}`,
            },
            unit_amount: Number(amountCents),
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        recipient: email,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;
