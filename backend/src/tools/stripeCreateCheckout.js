import { z } from 'zod';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

const Args = z.object({
  amount_cents: z.number().positive().max(100_000),
  recipient_email: z.string().email(),
});

const Result = z.object({
  url: z.string().url(),
});

/** @type {Tool<typeof Args, typeof Result>} */
export const stripeCreateCheckout = {
  name: 'stripe_createCheckout',
  description: 'Create a Stripe Checkout session and return the URL',
  argsSchema: Args,
  resultSchema: Result,
  async run({ amount_cents, recipient_email }) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: recipient_email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: `Payment to ${recipient_email}` },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { recipient: recipient_email },
    });
    return { url: session.url };
  },
}; 