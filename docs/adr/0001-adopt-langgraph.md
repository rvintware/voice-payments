# 0001 – Adopt LangGraph for Agent Orchestration

* Status: Proposed 2025-06-16  
* Deciders: Rehan Vishwanath (Eng Lead), Payment AI team  
* Technical Story: [GitHub Issue #42](https://github.com/your-org/voice-payments/issues/42)

## Context and Problem Statement

The current agent implementation (frontend `agent.js`) streams function-calling responses directly from GPT-4. This works for MVP load but presents several issues:

* **No deterministic replay** – debugging is painful.  
* **No branching / conditional logic** – multi-step flows require ad-hoc code.  
* **Limited observability** – tool arguments are not typed; validation happens late.  
* **Vendor lock-in** – tied to OpenAI chat-completion API shape.

We evaluated orchestration libraries to address these gaps.

## Decision Drivers

* Must support **streaming** partial results for a real-time UI.  
* Typed **state machine** to satisfy auditors (PCI & SOC-2).  
* Easy **tool integration** with existing TypeScript code.  
* Ability to **retry** idempotent steps automatically.  
* Active community & roadmap.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Hand-rolled state machine** | Full control, no deps | Reinvent wheel, no replay, expensive to maintain |
| **LangChain `AgentExecutor`** | Popular, integrated tools | Execution traces not strongly typed; branching via if/else code |
| **Autogen (Microsoft)** | Powerful multi-agent patterns | Python-only; requires nested LLM calls |
| **LangGraph** (the choice) | Typed DAG, replay, hooks, JS/TS support, native streaming | Younger project (<1yr), smaller community |

## Decision Outcome

We will adopt **LangGraph** as the orchestration layer for all agent workflows.

### Positive Consequences

* Deterministic replay via JSON state allows IR and audits.  
* Planner-Actor-Validator pattern enforces schema validation → fewer payment errors.  
* Built-in `@retry` and `max_steps` protect against infinite loops.  
* JS SDK integrates with existing Node backend; no service boundary changes.

### Negative Consequences

* Adds dependency weight; risk if project stalls.  
* Team must learn LangGraph concepts.  Training planned sprint-3.

### Ongoing Tasks

1. Implement PoC (`backend/src/services/agentGraph.ts`).  
2. Add unit tests & replay script.  
3. Remove legacy `agent.js` after front-end switch.

---

*Last updated: 2025-06-16* 