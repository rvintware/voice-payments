# Split-Bill Flow (Three Friends at Dinner)

```mermaid
sequenceDiagram
  autonumber
  participant Alice as "Alice (voice)"
  participant Bob as "Bob (voice)"
  participant Carol as "Carol (voice)"
  participant Frontend as "Shared SPA"
  participant Agent as "Planner"
  participant Stripe as "Stripe API"
  participant Webhook as "Webhook"
  participant Ledger as "TigerBeetle"
  participant Aurora as "Aurora PG"

  Alice->>Frontend: "Split $120 equally"
  Frontend->>Agent: /agent/plan {120, split: equal, 3 users}
  Agent-->>Frontend: 3× checkout sessions (40 each)
  par Parallel payments
    Frontend->>Stripe: createSession(Alice, $40)
    Frontend->>Stripe: createSession(Bob, $40)
    Frontend->>Stripe: createSession(Carol, $40)
  end
  Stripe-->>Webhook: session.completed (Alice)
  Stripe-->>Webhook: session.completed (Bob)
  Stripe-->>Webhook: session.completed (Carol)
  Webhook->>Ledger: Transfer each payer→merchant 40
  Ledger-->>Webhook: OK
  Webhook->>Aurora: insert payments, close split-group when 3/3 done
  Aurora-->>Frontend: SSE /feed {status: settled}
```

### Key Points
* Flow shows **parallel** payments; ledger posts only when each webhook event arrives to ensure atomicity.
* Agent tracks `split_group_id`; once Aurora marks the group complete, front-end updates UI.

---
*Generated: 2025-06-16* 