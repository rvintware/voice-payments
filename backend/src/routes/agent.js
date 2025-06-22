import { Router } from 'express';
import OpenAI from 'openai';
import { toolRegistry } from '../tools/index.js';
import { toOpenAIToolDef } from '../tools/types.js';
import { moderateText } from '../utils/moderateText.js';
import { parseChatResponse } from '../schemas/output.js';
import { inc } from '../utils/metrics.js';

const router = Router();

router.post('/agent', async (req, res) => {
  try {
    const { text, sessionId: bodySession } = req.body || {};
    // Unify session identification with the WebSocket layer (which uses client IP).
    const sessionId = bodySession || req.ip;
    if (!text) return res.status(400).json({ error: 'text required' });

    // Basic moderation before prompt injection
    const mod = await moderateText(text);
    if (!mod.ok) return res.status(403).json({ error: 'unsafe_text' });

    const openai = new OpenAI();
    // Chat ledger – start with the user message once and keep appending turns
    const scratch = [
      { role: 'user', content: text },
    ];
    for (let step = 0; step < 6; step++) {
      const messages = [
        {
          role: 'system',
          content: `You are the Voice-Payments agent.
TOOLS AVAILABLE:
• fsm_triggerConfirmRequest – must be the FIRST call for any money movement so the user can confirm.
• stripe_createCheckout       – completes payment after user confirmation.
• split_bill                 – splits a total amount and returns payment links.
• transactions_listRecent     – returns the most recent transactions.
• bank_getBalance            – returns the CAD available balance.

RULES:
1. You MUST call a tool every turn unless you are producing the final answer.
2. If no tool fits, respond with the final JSON object.
3. The final answer must be exactly one line of JSON: {"speak":"…","ui":"none|confirm|link|links|error","link":"…"} – no markdown fences or extra text.
4. Keep speak under 200 characters.
5. For security never guess account balances or statuses; always rely on tools.`,
        },
        ...scratch,
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
        messages,
        tools: toolRegistry.map(toOpenAIToolDef),
        tool_choice: step === 0 ? 'required' : 'auto',
        temperature: 0,
      });

      const msg = response.choices[0].message;
      // OpenAI tools format: each entry has { id, type:'function', function:{ name, arguments } }
      const toolCall = msg.tool_calls?.[0];
      if (toolCall) {
        const { name, arguments: rawArgs } = toolCall.function || {};
        const callId = toolCall.id;
        const tool = toolRegistry.find((t) => t.name === name);
        if (!tool) throw new Error('unknown_tool');
        let args;
        try {
          args = tool.argsSchema.parse(JSON.parse(rawArgs || '{}'));
        } catch (err) {
          return res.status(422).json({ error: 'bad_tool_args', details: err });
        }
        const observation = await tool.run(args, { sessionId });
        // Validate result
        tool.resultSchema.parse(observation);
        scratch.push(msg);
        scratch.push({
          role: 'tool',
          tool_call_id: callId ?? name, // id required for new API; fallback name
          content: JSON.stringify(observation),
        });
        continue; // next loop
      } else {
        // Expect JSON from the model
        let parsed;
        try {
          const raw = msg.content.trim()
            .replace(/^```json\s*/i, '')   // remove leading ```json
            .replace(/^```/, '')            // or bare ```
            .replace(/```\s*$/, '');       // trailing fence
          // Grab only the first well-formed JSON object to ignore extra chatter
          const jsonMatch = raw.match(/\{[\s\S]*?\}/);
          if (!jsonMatch) throw new Error('no_json_found');
          parsed = parseChatResponse(JSON.parse(jsonMatch[0]));
        } catch (err) {
          console.warn('Output schema violation', err);
          inc('output_schema_fail_total');
          return res.json({ speak: 'Sorry, I had an error.', ui: 'error' });
        }

        // Final moderation on speak text
        const outMod = await moderateText(parsed.speak);
        if (!outMod.ok) {
          inc('output_moderation_block_total');
          return res.json({ speak: 'Sorry, I cannot repeat that.', ui: 'error' });
        }

        return res.json(parsed);
      }
    }
    return res.status(400).json({ error: 'loop_limit' });
  } catch (err) {
    console.error('agent error', err);
    return res.status(500).json({ error: 'agent_failed' });
  }
});

export default router; 