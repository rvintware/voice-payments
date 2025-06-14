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
        content: `You extract payment intents from user utterances and call the function create_payment.`,
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
    ];

    const chat = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
      messages,
      functions,
    });

    const fnCall = chat.choices[0].message.function_call;
    if (!fnCall || fnCall.name !== 'create_payment') {
      return res.status(422).json({ error: 'parse_failed', transcript });
    }

    const args = JSON.parse(fnCall.arguments || '{}');
    let { amount_cents: amountCents, recipient_email: recipientEmail } = args;
    recipientEmail = normalizeRecipient(recipientEmail);

    if (!amountCents || !recipientEmail) {
      return res.status(422).json({ error: 'parse_incomplete', transcript });
    }

    res.json({ amountCents, recipientEmail });
  } catch (err) {
    console.error('Interpret error', err);
    res.status(500).json({ error: 'interpret_failed' });
  }
});

export default router; 