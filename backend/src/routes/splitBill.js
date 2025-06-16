import { Router } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { equalSplit } from '../utils/shareCalculator.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16'
});

const router = Router();

/**
 * POST /api/split
 * Body: {
 *   total_cents: 12000,
 *   currency: 'usd',
 *   friends: [
 *     { name:'Alice', email:'alice@example.com' },
 *     { name:'Bob',   email:'bob@example.com' }
 *   ]
 * }
 * Returns: { links:[ { name, amount_cents, url } ], share_cents }
 */
router.post('/split', async (req, res) => {
  try {
    const { total_cents, currency = 'usd', friends } = req.body || {};
    if (!total_cents || !Array.isArray(friends) || friends.length === 0) {
      return res.status(400).json({ error: 'total_cents and friends[] required' });
    }

    const shares = equalSplit(total_cents, friends.length);

    const links = [];
    for (let i = 0; i < friends.length; i += 1) {
      const friend = friends[i];
      const share = shares[i];

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: friend.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Split bill with ${req.body.caller_name ?? 'Friend'}`
              },
              unit_amount: share
            },
            quantity: 1
          }
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

      links.push({ name: friend.name ?? 'Friend', amount_cents: share, url: session.url });
    }

    res.json({ links });
  } catch (err) {
    console.error('splitBill error', err);
    res.status(500).json({ error: 'split_failed' });
  }
});

export default router; 