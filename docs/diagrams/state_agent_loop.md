# Agent Planner–Actor–Validator Loop

```mermaid
stateDiagram-v2
  [*] --> Plan
  Plan: Call GPT Planner\noutputs list of tool calls
  Plan --> Act: for each step
  Act: Execute tool\n(e.g. Stripe.checkout)
  Act --> Validate
  Validate: Parse LLM response\nwith Zod schema
  Validate --> Plan: if needs follow-up
  Validate --> Done: if final_answer || max_steps
  Validate --> Error: if schema error/timeout
  Error --> [*]
  Done --> [*]
```

## Explanation
1. **Plan** – The agent asks GPT‐4 to produce a step plan given the user intent.
2. **Act** – The executor runs the next tool (Stripe, Ledger, etc.).
3. **Validate** – The validator checks the JSON schema & business rules.
4. **Loop** – If more steps remain and max depth not reached, go back to Plan with updated context.

### Guardrails
* `max_steps` set to 8 to avoid infinite loops.  
* Each tool call wrapped in `retry(3, exponential)` decorator.  
* On schema failure, we surface an apology to the user and log the trace for replay.

---
*Generated: 2025-06-16* 