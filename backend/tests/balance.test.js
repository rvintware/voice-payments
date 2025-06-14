import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import expressApp from '../src/app.js';
import nock from 'nock';

// Mock Stripe API
const stripeApi = nock('https://api.stripe.com');

describe('GET /api/balance', () => {
  beforeEach(() => {
    stripeApi.get(/v1\/balance/).reply(200, {
      available: [{ amount: 12345, currency: 'cad' }],
      pending:   [{ amount: 6789,  currency: 'cad' }],
    });
  });

  it('returns available and pending', async () => {
    const res = await request(expressApp).get('/api/balance');
    expect(res.status).toBe(200);
    expect(res.body.availableCents).toBe(12345);
    expect(res.body.pendingCents).toBe(6789);
  });
}); 