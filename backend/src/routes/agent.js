import { Router } from 'express';
import OpenAI from 'openai';
import { toolRegistry } from '../tools/index.js';
import { toOpenAIToolDef } from '../tools/types.js';
import { moderateText } from '../utils/moderateText.js';
import { parseChatResponse } from '../schemas/output.js';
import { inc } from '../utils/metrics.js';
import { voicePaymentsSystemPrompt } from '../prompts/voicePaymentsSystem.js';

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
    // Track whether the model has already triggered the confirmation request
    let confirmSeen = false;
    for (let step = 0; step < 6; step++) {
      const messages = [
        {
          role: 'system',
          content: voicePaymentsSystemPrompt,
        },
        ...scratch,
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
        messages,
        tools: toolRegistry.map(toOpenAIToolDef),
        // Require a tool call only on the very first turn; later turns may return final JSON.
        tool_choice: step === 0 ? 'required' : 'auto',
        temperature: 0,
      });

      const msg = response.choices[0].message;
      // OpenAI tools format: each entry has { id, type:'function', function:{ name, arguments } }
      const toolCall = msg.tool_calls?.[0];
      if (toolCall) {
        // Prevent bypassing the confirmation phase: the FIRST tool call for any
        // money-moving intent must always be fsm_triggerConfirmRequest.
        const moneyTools = new Set(['stripe_createCheckout', 'split_bill']);
        const { name, arguments: rawArgs } = toolCall.function || {};

        // Enforce deterministic two-step flow: the first money-moving tool MUST be preceded by fsm_triggerConfirmRequest
        if (moneyTools.has(name) && !confirmSeen) {
          inc('confirmation_bypass_blocked_total');
          scratch.push({
            role: 'system',
            content: 'ERROR: You must call fsm_triggerConfirmRequest first when moving money. Retry now.',
          });
          continue; // retry
        }

        if (name === 'fsm_triggerConfirmRequest') {
          confirmSeen = true;
        }

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

        // If this was the confirmation trigger, reply immediately so the UI
        // can open the modal and switch to "answer" mode.
        if (name === 'fsm_triggerConfirmRequest') {
          return res.json({ speak: args.sentence, ui: 'confirm' });
        }

        // Otherwise keep the chat ledger and let the loop continue.
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
          const preliminaryObj = JSON.parse(jsonMatch[0]);
          if (typeof preliminaryObj.speak === 'string' && preliminaryObj.speak.length > 400) {
            preliminaryObj.speak = preliminaryObj.speak.slice(0, 400);
            inc('speak_truncated_total');
          }
          parsed = parseChatResponse(preliminaryObj);
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