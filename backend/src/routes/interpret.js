import { Router } from 'express';
import OpenAI from 'openai';
import { normalizeRecipient } from '../utils/email.js';

const router = Router();

router.post('/interpret', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    if (!transcript) return res.status(400).json({ error: 'transcript required' });

    const openai = new OpenAI();

    const messages = [
      {
        role: 'system',
        content:
          `You interpret user utterances for a voice banking app.
           If the user wants to make a payment, call create_payment.
           If the user asks for their balance (available, pending or both), call query_balance.`,
      },
      { role: 'user', content: transcript },
    ];

    const functions = [
      {
        name: 'create_payment',
        parameters: {
          type: 'object',
          properties: {
            amount_cents: { type: 'integer' },
            recipient_email: { type: 'string' },
          },
          required: ['amount_cents', 'recipient_email'],
        },
      },
      {
        name: 'query_balance',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['pending', 'available', 'both'] },
          },
          required: ['type'],
        },
      },
    ];

    const chat = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
      messages,
      functions,
    });

    const fnCall = chat.choices[0].message.function_call;
    if (!fnCall) return res.status(422).json({ error: 'parse_failed', transcript });

    if (fnCall.name === 'create_payment') {
      const args = JSON.parse(fnCall.arguments || '{}');
      let { amount_cents: amountCents, recipient_email: recipientEmail } = args;
      recipientEmail = normalizeRecipient(recipientEmail);

      if (!amountCents || !recipientEmail) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }
      return res.json({ amountCents, recipientEmail });
    } else if (fnCall.name === 'query_balance') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const { type } = args;
      if (!['pending', 'available', 'both'].includes(type)) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }
      return res.json({ intent: 'query_balance', type });
    }

    return res.status(422).json({ error: 'parse_failed', transcript });
  } catch (err) {
    console.error('Interpret error', err);
    res.status(500).json({ error: 'interpret_failed' });
  }
});

export default router; 