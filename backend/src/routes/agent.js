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
    const { text, sessionId = 'anon' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });

    // Basic moderation before prompt injection
    const mod = await moderateText(text);
    if (!mod.ok) return res.status(403).json({ error: 'unsafe_text' });

    const openai = new OpenAI();
    const scratch = [];
    for (let step = 0; step < 6; step++) {
      const messages = [
        {
          role: 'system',
          content:
            'You are the Voice-Payments agent. Think step-by-step, call tools when needed. If a payment is required, call fsm_triggerConfirmRequest.',
        },
        ...scratch,
        { role: 'user', content: text },
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
        messages,
        tools: toolRegistry.map(toOpenAIToolDef),
        function_call: 'auto',
        temperature: 0,
      });

      const msg = response.choices[0].message;
      const call = msg.tool_calls?.[0] || msg.function_call;
      if (call) {
        const { name, arguments: rawArgs, id: callId } = call;
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
          parsed = parseChatResponse(JSON.parse(msg.content));
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