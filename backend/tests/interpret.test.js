import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import nock from 'nock';
import expressApp from '../src/app.js';

// Mock OpenAI chat completions endpoint
const openaiApi = nock('https://api.openai.com');

describe('POST /api/interpret', () => {
  beforeEach(() => {
    openaiApi.post('/v1/chat/completions').reply(200, {
      id: 'chatcmpl-123',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            function_call: {
              name: 'create_payment',
              arguments: JSON.stringify({ amount_cents: 2000, recipient_email: 'teja' }),
            },
          },
        },
      ],
    });
  });

  it('returns parsed amount and normalized email', async () => {
    const res = await request(expressApp)
      .post('/api/interpret')
      .send({ transcript: 'send twenty dollars to Teja' });
    expect(res.status).toBe(200);
    expect(res.body.amountCents).toBe(2000);
    expect(res.body.recipientEmail).toBe('teja@gmail.com');
  });
}); 