import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// mock Stripe SDK
vi.mock('stripe', () => {
  return {
    default: function MockStripe() {
      return {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({ url: 'https://checkout.test/xyz' })
          }
        }
      };
    }
  };
});

describe('POST /api/split', () => {
  it('returns checkout links', async () => {
    const res = await request(app)
      .post('/api/split')
      .send({ total_cents: 12000, currency: 'usd', friends: [{ name: 'Alice' }, { name: 'Bob' }] });
    expect(res.status).toBe(200);
    expect(res.body.links.length).toBe(2);
    expect(res.body.links[0]).toHaveProperty('url');
  });
}); 