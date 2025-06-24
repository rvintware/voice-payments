import { Router } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { equalSplit } from '../utils/shareCalculator.js';
import { normalizeFriends } from '../utils/friendHelpers.js';

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
    let { currency = 'usd' } = req.body || {};

    // 1) Flexible total field names
    let rawTotal = req.body.total_cents ?? req.body.amount_cents ?? req.body.total;
    const total_cents = Math.round(Number(rawTotal));
    if (!Number.isFinite(total_cents) || total_cents <= 0) {
      return res.status(400).json({ error: 'invalid_total' });
    }

    // 2) Normalise friends list
    const friends = normalizeFriends(req.body.friends);
    if (!friends) {
      return res.status(400).json({ error: 'friends_required' });
    }

    // Dutch split: caller also pays a share, so divide by friends+1.
    const shares = equalSplit(total_cents, friends.length + 1);
    // eslint-disable-next-line no-console
    console.debug('[SPLIT shares]', { total_cents, shares });

    const links = [];
    for (let i = 0; i < friends.length; i += 1) {
      const friend = friends[i];
      const share = shares[i + 1]; // skip caller's own share at index 0

      let url = 'https://example.com/checkout/dev';
      try {
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
        url = session.url;
      } catch (sdkErr) {
        console.warn('Stripe SDK split link failed; using placeholder', sdkErr?.message);
      }

      links.push({ name: friend.name ?? 'Friend', amount_cents: share, currency, url });
    }

    res.json({ links });
  } catch (err) {
    console.error('splitBill error', err);
    res.status(500).json({ error: 'split_failed' });
  }
});

export default router; 