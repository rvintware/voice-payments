# End-to-End Payment Flow (Voice → Ledger)

The diagram below illustrates every moving part from the moment a user presses the microphone in the SPA to when the double-entry ledger is updated and the UI speaks back the confirmation.

```mermaid
sequenceDiagram
  autonumber
  actor User as "User (voice)"
  participant Frontend as "React SPA"
  participant ASR as "Whisper ASR"
  participant Agent as "LangGraph Planner/Actor"
  participant Stripe as "Stripe Checkout"
  participant Webhook as "Stripe Webhook"
  participant Backend as "Express API"
  participant Ledger as "TigerBeetle"
  participant Aurora as "Aurora PG"
  participant TTS as "TTS Service"
  Note over Frontend,Backend: Edge-Auth (CloudFront)
  User->>Frontend: Press mic ▶ speak amount
  Frontend->>ASR: Stream audio chunks (WebSocket)
  ASR-->>Frontend: Partial & final transcript
  Frontend->>Agent: POST /agent/plan {text}
  Agent-->>Frontend: JSON plan -> tool_call=stripe.checkout
  Frontend->>Stripe: Redirect to hosted checkout
  Stripe-->>User: Card input & 3-DS
  Stripe-->>Frontend: success_url?session_id=...
  Stripe-->>Webhook: POST /webhook (checkout.session.completed)
  Webhook->>Backend: verify sig + upsert payment
  Backend->>Ledger: Create transfer (user→platform)
  Ledger-->>Backend: OK (txid)
  Backend->>Aurora: Persist txn & idempotency key
  Backend-->>Frontend: SSE /feed → new payment event
  Frontend->>TTS: /speak "Paid $36.42 to Acme"
  TTS-->>User: Audio
```

## Legend
* **Edge-Auth**: CloudFront Function validates JWT/HMAC before requests hit `Frontend` or `Backend` origins.
* **Aurora** stores business entities (users, invoices, split rules) while **TigerBeetle** guarantees balanced transfers.

## Why this matters
Visualising latency-critical hops (bold arrows) helps set SLAs: ASR < 300 ms, Agent < 1.5 s, Stripe redirect path depends on user.

---
*Generated: 2025-06-16* 