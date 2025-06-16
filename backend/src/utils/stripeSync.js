import Stripe from 'stripe';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

// A lightweight helper to pull recent PaymentIntents from Stripe and mirror them into SQLite.
// Called once on server boot; webhook keeps DB fresh after that.
export async function syncStripePayments(limit = 1000) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not set – skipping Stripe back-fill');
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Use latest stable or override via env like rest of project
    apiVersion: process.env.STRIPE_API_VERSION || '2023-08-16'
  });

  console.log(`🔄  Syncing up to ${limit} payment intents from Stripe…`);

  let fetched = 0;
  let params = {
    limit: 100,
    expand: [
      'data.latest_charge.payment_method_details.card',
      'data.charges.data.billing_details'
    ]
  };

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const list = await stripe.paymentIntents.list(params);

    list.data.forEach((pi) => {
      const card = pi.latest_charge?.payment_method_details?.card ?? {};
      const email =
        pi.customer?.email ||
        pi.charges?.data?.[0]?.billing_details?.email ||
        '';

      db.prepare(
        `INSERT INTO payments (
            id, amount, currency, status, description,
            card_brand, last4, customer_email,
            created_at, updated_at)
         VALUES (@id, @amount, @currency, @status, @description,
                 @card_brand, @last4, @customer_email,
                 @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           amount=excluded.amount,
           status=excluded.status,
           description=excluded.description,
           card_brand=excluded.card_brand,
           last4=excluded.last4,
           customer_email=excluded.customer_email,
           updated_at=excluded.updated_at`
      ).run({
        id: pi.id,
        amount: pi.amount_received ?? pi.amount,
        currency: pi.currency,
        status: pi.status,
        description: pi.description ?? '',
        card_brand: card.brand ?? '',
        last4: card.last4 ?? '',
        customer_email: email,
        created_at: new Date(pi.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    fetched += list.data.length;
    if (!list.has_more || fetched >= limit) break;
    params.starting_after = list.data[list.data.length - 1].id;
  }

  console.log(`✅  Synced ${fetched} payment intents from Stripe`);
} 