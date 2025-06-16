import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from '../src/utils/db.js';

// We will import the function after mocking Stripe so it picks up the mock

const fakePI = (id, status = 'succeeded') => ({
  id,
  amount: 5000,
  currency: 'usd',
  status,
  description: 'Unit test payment',
  latest_charge: {
    payment_method_details: { card: { brand: 'visa', last4: '4242' } }
  },
  charges: {
    data: [
      {
        payment_method_details: { card: { brand: 'visa', last4: '4242' } },
        billing_details: { email: 'test@example.com' }
      }
    ]
  },
  created: Math.floor(Date.now() / 1000)
});

vi.mock('stripe', () => {
  return {
    default: function MockStripe() {
      return {
        paymentIntents: {
          list: vi
            .fn()
            // First call returns 2 items, has_more false
            .mockResolvedValueOnce({
              data: [fakePI('pi_1'), fakePI('pi_2', 'processing')],
              has_more: false
            })
        }
      };
    }
  };
});

// Need to dynamically import after mocking
import { syncStripePayments } from '../src/utils/stripeSync.js';

// spy on db.prepare so we can verify writes
const prepareSpy = vi.spyOn(db, 'prepare');

beforeEach(() => {
  prepareSpy.mockClear();
});

describe('syncStripePayments', () => {
  it('inserts rows for each payment intent', async () => {
    await syncStripePayments();
    expect(prepareSpy.mock.calls.length).toBe(2);
  });
}); 