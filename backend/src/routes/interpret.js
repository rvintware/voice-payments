import { Router } from 'express';
import OpenAI from 'openai';
import { normalizeRecipient } from '../utils/email.js';
import { extractName } from '../utils/parser.js';

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
          `You convert spoken banking commands into structured JSON.
           ALWAYS reply with a JSON function_call – never plain text.

           • "send/pay/give X dollars to NAME" → create_payment { amount_cents, recipient_email }
           • "what's my pending/available/both balance" → query_balance { type }
           • "show my recent transactions" → query_recent_transactions { limit }
           • "split X dollars three ways with Alice and Bob" → split_bill { total_cents, currency, friends }

           When the user provides only a name (no email), build recipient_email by:
              1. trimming spaces
              2. converting to lowercase
              3. removing non-alphanumeric chars
              4. appending "@gmail.com".

           NEVER invent placeholders like "example@gmail.com" – use the spoken name instead.`,
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
      {
        name: 'query_recent_transactions',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 }
          },
          required: []
        }
      },
      {
        name: 'query_revenue',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'yesterday', 'week', 'month'], default: 'today' }
          },
          required: []
        }
      },
      {
        name: 'search_transactions',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['succeeded', 'processing', 'failed', 'incomplete'] },
            min_amount_cents: { type: 'integer' },
            max_amount_cents: { type: 'integer' },
            currency: { type: 'string' },
            from_date: { type: 'string' },
            to_date: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
          }
        }
      },
      {
        name: 'aggregate_transactions',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'yesterday', 'week', 'month', 'year', 'all'], default: 'today' },
            status: { type: 'string', enum: ['succeeded', 'failed', 'incomplete', 'all'], default: 'succeeded' },
            currency: { type: 'string' }
          }
        }
      },
      {
        name: 'split_bill',
        parameters: {
          type: 'object',
          properties: {
            total_cents: { type: 'integer' },
            currency: { type: 'string', default: 'usd' },
            friends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                },
                required: ['name']
              },
              minItems: 1
            }
          },
          required: ['total_cents', 'friends']
        }
      },
    ];

    const chat = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
      messages,
      functions,
      function_call: 'auto',
      temperature: 0.2,
    });

    const fnCall = chat.choices[0].message.function_call;
    if (!fnCall) return res.status(422).json({ error: 'parse_failed', transcript });

    if (fnCall.name === 'create_payment') {
      const args = JSON.parse(fnCall.arguments || '{}');
      let { amount_cents: amountCents, recipient_email: recipientEmail } = args;
      recipientEmail = normalizeRecipient(recipientEmail);

      // Fallback: model sometimes returns placeholder email.
      let displayName = null;
      if (recipientEmail.startsWith('example@')) {
        const guessedName = extractName(transcript);
        if (guessedName) {
          displayName = guessedName;
          recipientEmail = normalizeRecipient(guessedName);
        }
      }

      if (!amountCents || !recipientEmail) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }
      // Money-moving intent – require confirmation in FSM layer
      const dollars = (amountCents / 100).toFixed(2);
      const rawName = displayName ?? recipientEmail.split('@')[0];
      const prettyName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const sentence = `Send ${dollars} Canadian dollars to ${prettyName}. Should I proceed?`;
      return res.json({ intent: 'confirm_request', sentence, amountCents, recipientEmail });
    } else if (fnCall.name === 'query_balance') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const { type } = args;
      if (!['pending', 'available', 'both'].includes(type)) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }

      // Fetch cached balance from dedicated route
      const balRes = await fetch('http://localhost:4000/api/balance');
      const balJson = await balRes.json();
      const cents =
        type === 'pending'
          ? balJson.pendingCents
          : type === 'available'
          ? balJson.availableCents
          : balJson.pendingCents + balJson.availableCents;

      const { balanceSentence } = await import('../utils/speechTemplates.js');
      const sentence = balanceSentence({ type, cents });
      return res.json({ intent: 'speak', sentence });
    } else if (fnCall.name === 'query_recent_transactions') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const limit = Math.max(1, Math.min(args.limit ?? 5, 10));

      // Fetch the latest rows directly from the REST API
      const txRes = await fetch(
        'http://localhost:4000/api/transactions?' +
          new URLSearchParams({ limit })
      );
      if (!txRes.ok) {
        console.error('Recent tx fetch failed', await txRes.text());
        return res.status(500).json({ error: 'tx_fetch_failed' });
      }
      const { transactions } = await txRes.json();

      // Turn the rows into a human-readable sentence
      const { formatList } = await import('../utils/formatters.js');
      const sentence = formatList(transactions);

      return res.json({ intent: 'speak', sentence });
    } else if (fnCall.name === 'query_revenue') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const period = args.period || 'today';
      if (!['today', 'yesterday', 'week', 'month'].includes(period)) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }
      return res.json({ intent: 'query_revenue', period });
    } else if (fnCall.name === 'search_transactions') {
      const filters = JSON.parse(fnCall.arguments || '{}');
      const searchRes = await fetch('http://localhost:4000/api/transactions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      const list = await searchRes.json();
      const { formatList } = await import('../utils/formatters.js');
      const sentence = formatList(list);
      return res.json({ intent: 'speak', sentence });
    } else if (fnCall.name === 'aggregate_transactions') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const aggUrl = 'http://localhost:4000/api/transactions/aggregate?' + new URLSearchParams(args);
      const aggRes = await fetch(aggUrl);
      const summary = await aggRes.json();
      const { formatSummary } = await import('../utils/formatters.js');
      const sentence = formatSummary(summary, args);
      return res.json({ intent: 'speak', sentence });
    } else if (fnCall.name === 'split_bill') {
      const args = JSON.parse(fnCall.arguments || '{}');
      const { total_cents: totalCents, currency = 'usd', friends } = args;
      if (!totalCents || !Array.isArray(friends) || friends.length === 0) {
        return res.status(422).json({ error: 'parse_incomplete', transcript });
      }
      // Call internal split route
      const splitRes = await fetch('http://localhost:4000/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_cents: totalCents, currency, friends })
      });
      if (!splitRes.ok) {
        console.error('split route failed', await splitRes.text());
        return res.status(500).json({ error: 'split_failed' });
      }
      const json = await splitRes.json();
      // Build spoken sentence listing links
      const linkList = json.links.map(l => `${l.name}: ${ (l.amount_cents/100).toFixed(2) }`).join(', ');
      const sentence = `I have created the payment links. ${linkList}. I've copied them to your clipboard.`;
      return res.json({ intent: 'split_links', links: json.links, sentence });
    }

    return res.status(422).json({ error: 'parse_failed', transcript });
  } catch (err) {
    console.error('Interpret error', err);
    res.status(500).json({ error: 'interpret_failed' });
  }
});

export default router; 