# Voice Payments – Ask-Anything Edition (v0.3.0)

Money should move at the speed of conversation.  This repo shows how to turn **speech → intent → Stripe** into a fully-featured developer prototype using Whisper, GPT function-calling, Alloy TTS and a local SQLite mirror for lightning-fast queries.

> "Show me my failed charges over fifty dollars."  
> "How much revenue did we make today?"  
> "What's the status of payment intent _pi_3RZiF…_?"

All answered aloud in under a second.

---

## 1 What's new in v0.3.0

| Area | Upgrade |
|------|---------|
| Data | SQLite mirror populated by Stripe webhooks (`/webhooks/stripe`) |
| API  | Flexible search (`/api/transactions/search`) & aggregate (`/aggregate`) endpoints |
| AI   | New GPT tools: `search_transactions`, `aggregate_transactions` |
| Voice| Generic speech playback helper; any backend sentence → Alloy TTS → `<audio>` |
| UI   | Robin-hood style timeline feed + global `TransactionsContext` |

---

## 1.1 Patch v0.3.1 (2025-06-15) – Dev-proxy & Timeline Bug-fix

| Reason | Change | File(s) |
|--------|--------|---------|
| Front-end 404s on `/api/transactions` | Added Vite dev-server proxy so any request beginning with `/api` is forwarded to the Express backend on port 4000. | `frontend/vite.config.js` (`server.proxy` block) |
| Backend mount mismatch | Mounted `transactionsRouter` at `/api/transactions` (was `/api`) so the final path resolves to `/api/transactions` as documented. | `backend/src/app.js` |
| Infinite fetch loop in React | The two fixes above turn previous 404 responses into 200, stopping the exponential re-tries in `useTransactions` and allowing the timeline component to render. | — |

### Debug walkthrough (for the curious)
1. **Symptom** – DevTools showed endless `404 /api/transactions?limit=25` plus React errors.
2. **Hypothesis** – Either the proxy was missing or the server route path was wrong.
3. **Confirmation**
   • `curl http://localhost:4000/api/transactions` returned JSON ➜ route exists.<br/>
   • Same URL via browser on port 5173 returned 404 ➜ proxy missing.<br/>
4. **Fix 1** – Added Vite proxy.<br/>
5. **Symptom persisted** – Now the browser hit `GET /api/transactions` on the backend and still saw 404. <br/>
6. **Fix 2** – Realised router was mounted at `/api`, not `/api/transactions`; remounted correctly.
7. **Result** – 200 OK, timeline feed populates, GPT "show my recent transactions" now succeeds.

> Take-away: Always line-up **front-end fetch path → dev proxy → Express mount path**. A one-character drift causes silent 404s that look like "broken React".

---

## 1.2 Patch v0.3.2 (2025-06-16) – Stripe sync & enriched timeline

| Reason | Change | File(s) |
|--------|--------|---------|
| Stripe ↔ SQLite drift | On-boot back-fill helper `syncStripePayments` pulls recent PaymentIntents so the local mirror always matches the Dashboard. | `backend/src/utils/stripeSync.js`, `backend/src/app.js` |
| Show customer in feed | Added `customer_email` column, captured by webhook & back-fill. | `backend/src/utils/db.js`, `stripeWebhook.js` |
| Timeline UI lacked e-mail | Feed renders e-mail under amount. | `frontend/TransactionsFeed.jsx` |
| Filter via URL | `/api/transactions` now supports `?status=succeeded|failed|all` for lighter payloads. | `backend/routes/transactions.js` |

---

## 2 Feature matrix & details

| # | Capability | User speaks… | System does | Tech bits |
|---|------------|--------------|-------------|-----------|
| 1 | Natural-language payments | "Send twenty dollars to Teja" | Whisper → GPT → `create_payment` → Stripe Checkout link | `create_payment` tool, `routes/createPayment.js` |
| 2 | Voice confirmation | "Yes" / "No" answer to Alloy prompt | Modal + Alloy TTS prompt then `/voice-confirm` | `tts/confirm`, `voiceConfirm.js` |
| 3 | Balance enquiry | "What's my pending balance?" | Uses cached `/api/balance`, speaks amount | `BalanceContext`, generic `/tts/say` |
| 4 | Timeline feed | — | Infinite scroll of recent payments | `TransactionsContext`, `/api/transactions` |
| 5 | Free-form search | "List failed charges over fifty dollars" | GPT → `search_transactions` → sentence → speak | `/transactions/search`, dynamic SQL |
| 6 | Aggregated stats | "How much revenue this month?" | GPT → `aggregate_transactions` → totals → speak | `/transactions/aggregate`, formatter |
| 7 | Multi-currency awareness | "Show me CAD payments only" | Currency filter in both search & aggregate | `currency` param everywhere |
| 8 | Amount filters | "over fifty dollars", "below $5" | `min_amount_cents`, `max_amount_cents` | Same search route |
| 9 | Date filters | "from last Monday", "today", "this week" | Approx date parsing -> period param | Built-in period map |
|10 | Low-latency audio | Any sentence | Alloy TTS, cached MP3 blob, reused `<audio>` | `playAudio.js` cache Map |

💡 **Business impact** – Together these features replicate 90 % of Stripe Dashboard's "Payments" tab hands-free, cutting lookup time from ~30 s (open laptop, filter UI) to <2 s spoken.

---

## 3 Quick-start (dev)

```bash
# 1. backend env
cp backend/.env.example backend/.env
#   add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, OPENAI_API_KEY

# 2. start API
cd backend && npm install && npm run dev

# 3. forward Stripe events
stripe login                      # one-time browser OAuth
stripe listen --events payment_intent.* \
             --forward-to localhost:4000/webhooks/stripe

# 4. start front-end
cd ../frontend && npm install && npm run dev
```

(optional) generate a test payment:
```bash
stripe trigger payment_intent.succeeded
```
Watch the feed update and Alloy announce the new payment ("Cha-ching…").

---

## 4 Environment variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | backend routes | Verify webhooks & future Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | `stripeWebhook.js` | Signature validation |
| `OPENAI_API_KEY` | Whisper, GPT, Alloy | All LLM & TTS calls |
| `OPENAI_CHAT_MODEL` (opt) | `/interpret` | Switch GPT model |
| `DB_PATH` (opt) | `utils/db.js` | Custom SQLite location |

`backend/.env.example` contains placeholders for all of the above.

---

## 5 Database schema

```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  amount INTEGER,          -- cents
  currency TEXT,
  status TEXT,             -- succeeded, failed …
  description TEXT,
  card_brand TEXT,
  last4 TEXT,
  customer_email TEXT,
  created_at TEXT,         -- ISO8601
  updated_at TEXT
);
CREATE INDEX payments_created_at_idx ON payments(created_at);
CREATE INDEX payments_status_idx      ON payments(status);
```
The DB lives in `backend/data/stripe.db` (or `DB_PATH`).  All read queries are sub-millisecond.

---

## 6 Route reference

### 6-A.  Inbound (Stripe → backend)
| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/webhooks/stripe` | raw Stripe event | UPSERT into `payments` & broadcast `new_payment` (future) |

### 6-B.  Public REST (frontend ↔ backend)
| Method | Path | Params / Body | Description |
|--------|------|---------------|-------------|
| GET | `/api/transactions` | limit, starting_after, **status** | Infinite-scroll feed |
| POST | `/api/transactions/search` | JSON filters | Flexible finder |
| GET | `/api/transactions/aggregate` | period, status, currency | Totals & averages |
| *(legacy)* | `/api/balance` etc. | | Older voice features |

### 6-C.  Voice layer
| Method | Path | Purpose |
| POST | `/api/voice-to-text` | Whisper transcription |
| POST | `/api/interpret` | GPT function-calling |
| POST | `/api/tts/say` | Alloy TTS MP3 stream |

---

## 7 GPT function catalogue

```jsonc
create_payment            // v0.1
query_balance             // v0.2
search_transactions       // v0.3
aggregate_transactions    // v0.3
```
Detailed JSON schemas live inside `backend/src/routes/interpret.js`.

---

## 8 Flow walkthrough

```mermaid
sequenceDiagram
    participant U as User (mic)
    participant FE as Front-end (React)
    participant ASR as /voice-to-text
    participant GPT as /interpret (GPT)
    participant DB as SQLite payments
    participant API as /transactions/*
    participant TTS as /tts/say (Alloy)

    U->>FE: hold mic, speak question
    FE->>ASR: WebM audio
    ASR-->>FE: { transcript }
    FE->>GPT: { transcript }
    GPT-->>FE: { intent:'search_transactions', sentence? }
    alt intent == speak
        FE->>TTS: { text: sentence }
        TTS-->>FE: MP3 stream
        FE-->>U: play audio
    else other intent (payment, balance)
        FE->>API: query data
        API-->>GPT: JSON rows
        GPT-->>FE: sentence
        FE->>TTS: speech
        TTS-->>U: audio
    end
```

🕑 **Latency budget**
| Segment | Typical |
| Whisper 10 s | 1.3 s |
| GPT parse   | 0.4 s |
| SQLite read | <2 ms |
| Alloy TTS   | 0.7 s |
| Playback    | 0.1 s |

---

## 9 Code highlights

* `backend/src/utils/db.js` – lazy-loads `better-sqlite3`, auto-migrates.
* `backend/src/routes/transactionsSearch.js` – dynamic `WHERE` builder.
* `backend/src/routes/transactionsAggregate.js` – period-aware totals.
* `backend/src/utils/formatters.js` – deterministic English sentences.
* `frontend/src/utils/playAudio.js` – sentence→MP3 cache.
* `frontend/src/components/VoiceButton.jsx` – one intent handler to rule them all.

---

## 10 Error-handling cheatsheet

| Error | Likely fix |
|-------|------------|
| 400 `Webhook signature failed` | Check `STRIPE_WEBHOOK_SECRET` |
| 422 `parse_incomplete` | Speak more clearly; GPT lacked parameters |
| 500 `TTS request failed` | Verify `OPENAI_API_KEY` quota |

---

## 11 Tests & CI

Run locally:
```bash
# backend
cd backend && npm test
# frontend
cd ../frontend && npm test
```
GitHub Actions executes the same; coverage must stay green.

---

## 12 Roadmap (highlights)

* WebSocket push ➜ live "Cha-ching" alerts.
* SSML support for better pronunciation.
* Multi-currency conversion via Stripe FX rates.

---

## 13 License & Conduct

MIT License + Contributor Covenant 2.1 – see original sections.

## 14 Demo script & live checklist

### 14-A Pre-flight checks

| Check | Command / Action | Expected |
|-------|------------------|----------|
| Homebrew installed | `brew --version` | prints version |
| FFmpeg for Whisper | `ffmpeg -version` \| `brew install ffmpeg` | prints version |
| Stripe CLI | `stripe version` | prints 1.x.y |
| OpenAI quota | `curl https://api.openai.com/v1/dashboard/billing/credit_grants -H "Authorization: Bearer $OPENAI_API_KEY"` | JSON with >0 credits |
| Mic permission (macOS) | System Settings → Privacy & Security → Microphone | Browser is toggled **on** |

### 14-B Run-of-show (5 min)

| Step | You do | Audience sees | Audience hears |
|------|--------|--------------|----------------|
| 1 | 🎤 "How much revenue did we make today?" | No UI change | Alloy: total revenue sentence |
| 2 | 🎤 "List failed charges over fifty dollars." | Red `Failed` row highlighted | Alloy lists failed row(s) |
| 3 | 🎤 "What's my available balance?" | Balance bar pulses | Alloy speaks amount |
| 4 | 🎤 "Send twenty dollars to Alex." → 🎤 "Yes" | Modal → Checkout link | Alloy confirmation prompt |
| 5 | Trigger `stripe trigger payment_intent.succeeded` in terminal | New green row pops | (optional WS) "Cha-ching!" |

### 14-C Test-card cheat-sheet

| Scenario | Payment method id | Effect |
|----------|-------------------|--------|
| Success | `pm_card_visa` | `payment_intent.succeeded` |
| Declined | `pm_card_chargeDeclined` | `payment_intent.payment_failed` |
| 3-D Secure | `pm_card_authenticationRequired` | Checkout shows challenge |

### 14-D Common rescue maneuvers

* **Mic blocked** – flip the browser toggle in macOS privacy, reload page.
* **Webhook silent** – confirm `stripe listen` is running & `STRIPE_WEBHOOK_SECRET` matches.
* **TTS 401/429** – check remaining OpenAI credits with command above.
* **Better-sqlite missing** – `npm install better-sqlite3` inside `backend`.

> With these items checked, the end-to-end demo runs in 
> < 2 seconds per question and no internet besides Stripe + OpenAI APIs.

---

## Appendix A Consistent Spoken Responses (v0.4)

Speech output is now generated in a single, predictable way so that:

* **UX stays familiar** – every balance or list sentence follows the same rhythm.
* **Unit-testing is trivial** – deterministic strings, no React logic involved.
* **Localisation** is one file away – swap templates, keep the rest of the stack.
* **SSML / prosody tweaks** later require touching only the template helpers.

### Key Modules

| File | Responsibility |
|------|----------------|
| `backend/src/utils/moneyWords.js` | Converts integer cents → English words using `number-to-words`.  CJS module, imported via default export: `import toWordsPkg …; const { toWords } = toWordsPkg;`. |
| `backend/src/utils/speechTemplates.js` | Pure functions that turn raw numbers / rows into **complete** sentences, e.g. `balanceSentence`, `listSentence`. |
| `backend/src/utils/formatters.js` | Helpers that adapt DB rows or aggregates before handing them to the templates. |
| `backend/src/routes/interpret.js` | GPT function-calling branch; fetches any required data, calls the templates, then returns `{ intent:'speak', sentence }`. |
| `backend/src/routes/ttsSay.js` | Turns a sentence into Alloy MP3 using OpenAI TTS.  Stateless, cache lives in the browser. |
| `frontend/src/utils/playAudio.js` | Browser-side cache + `<audio>` player.  Front-end **never** pieces sentences together. |

### End-to-End Flow

```mermaid
sequenceDiagram
  participant Mic
  participant FE as Front-end
  participant API
  participant GPT
  participant DB
  participant TTS

  Mic->>FE: user speech (webm)
  FE->>API: /voice-to-text
  API->>GPT: Whisper transcript → chat
  GPT-->>API: function_call e.g. <query_balance>
  API->>DB: fetch rows / cents
  DB-->>API: JSON
  API->>API: template → sentence
  API-->>FE: { intent:"speak", sentence }
  FE->>TTS: /api/tts/say { text }
  TTS-->>FE: mp3 stream
  FE->>Mic: 🔊 play audio
```

### Extending

```js
// Add a new spoken reply, e.g. monthly revenue
export function revenueSentence({ period, totalCents }) {
  return `Your revenue for ${period} is ${moneyToWords(totalCents)}.`;
}
```
Touching a single helper makes the new phrasing available to GPT, the REST layer and the test-suite.

### Edge-cases Covered

* amounts = 0 → "zero dollars"  
* singular vs plural cents/dollars  
* negative values prepend "minus" (refunds)
* zero totals and $0 transactions now speak "zero dollars" instead of truncating

> With this appendix you can onboard a teammate in 30 s: "All speech lives in `speechTemplates.js`; the front-end just plays MP3s."

---

## Appendix B Transaction-History Sync Design (v0.3.2)

### B.1 Why we needed it
* Stripe Dashboard ≠ local dev DB when webhooks are missed.
* React timeline needs <100 ms latency and offline capability.
* We wanted richer columns (customer email, card brand) not originally stored.

### B.2 Architecture Overview
```text
Stripe  ──► Webhook (real-time)
        ╰─► REST list (boot back-fill)
                       │ UPSERT
                       ▼
                 SQLite (payments)
                       │ SELECT
                       ▼
                 React infinite scroll
```

### B.3 Sequence Diagram
```mermaid
sequenceDiagram
    participant FE as React UI
    participant API as Express backend
    participant DB as SQLite
    participant Stripe

    Stripe->>+API: Webhook payment_intent.* (real-time)
    API->>DB: UPSERT row
    Stripe-->>-API: 200 OK

    alt on-boot
        API->>Stripe: REST /payment_intents.list (paginated)
        Stripe-->>API: JSON page
        loop per PI
            API->>DB: UPSERT
        end
    end

    FE->>API: GET /api/transactions?status=succeeded
    API->>DB: SELECT LIMIT 25
    DB-->>API: rows
    API-->>FE: JSON
```

### B.4 Key Implementation Points
| Area | Decision | File |
|------|----------|------|
| Data model | Add `customer_email` column; keep `PaymentIntent.id` PK | `backend/src/utils/db.js` |
| Back-fill | `syncStripePayments()` runs at server boot; paginates; expands card + billing email | `backend/src/utils/stripeSync.js` |
| Webhook | Accept **all** `payment_intent.*`, same UPSERT SQL | `backend/src/routes/stripeWebhook.js` |
| API | Added `status` query param for lighter HTTP payloads | `backend/src/routes/transactions.js` |
| Front-end | Show email under amount; keeps existing infinite-scroll logic | `frontend/src/components/TransactionsFeed.jsx` |

### B.5 Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Only webhooks, no back-fill | Zero extra API calls | Stale rows if laptop was off when events fired |
| Poll Stripe REST each page load | Always live data | 500 ms latency, expose secret key, pagination complexity |
| Postgres datastore | Scales horizontally | Heavy for single-table prototype |

### B.6 Failure Modes & Guards
* Duplicate events → SQLite `ON CONFLICT` guarantees idempotence.
* Listener offline → on-boot back-fill self-heals.
* Column mismatch → migration block adds column if missing.

### B.7 Performance Snapshot (M1 Macbook)
| Stage | Median |
|-------|--------|
| Back-fill 1 000 PIs | 1.2 s |
| Feed page query | <2 ms |
| Stripe REST list (100) | ~380 ms |

> **Take-away:** Hybrid back-fill ＋ idempotent webhooks keeps the local DB within seconds of Stripe while retaining sub-2 ms UI queries.

---

## Appendix C Bill-Splitting (Going Dutch)

### C.1 Why we added it
* Friends often need to split drinks / rides; pulling out phones breaks the voice-first flow.
* Stripe Checkout already handles payment collection & receipts – we just needed to issue **multiple** links instead of one.
* Letting the caller pay nothing upfront keeps the feature risk-free.

### C.2 Stripe design
| Object | 1 per | Notes |
|--------|-------|-------|
| **Checkout Session** | Friend | Simplest way to give each person their own hosted pay-page. Funds settle to the caller's Stripe account once each friend pays. |
| PaymentIntent | (inside session) | Price is fixed at their share of the bill. |

Why not one session with several line-items? Because Checkout would group all items into **one** card payment – the caller would have to pay first.

### C.3 REST route – `/api/split`
```http
POST /api/split
{
  "total_cents": 12000,
  "currency"   : "usd",
  "friends"    : [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob" }                       // email optional
  ]
}
→ 200 OK
{
  "links": [
    { "name":"Alice", "amount_cents":6000, "url":"https://checkout.stripe.com/pay/cs_test_…" },
    { "name":"Bob",   "amount_cents":6000, "url":"https://checkout.stripe.com/pay/cs_test_…" }
  ]
}
```
See `backend/src/routes/splitBill.js` for full implementation.

### C.4 GPT function definition
Inside `routes/interpret.js`:
```jsonc
{
  "name": "split_bill",
  "parameters": {
    "type": "object",
    "properties": {
      "total_cents": { "type": "integer" },
      "currency":    { "type": "string", "default": "usd" },
      "friends": {
        "type": "array",
        "items": { "type": "object", "properties": {
          "name": { "type": "string" },
          "email":{ "type": "string" }
        }, "required": ["name"] },
        "minItems": 1
      }
    },
    "required": ["total_cents", "friends"]
  }
}
```

### C.5 End-to-end flow
```mermaid
sequenceDiagram
    participant U  as User (mic)
    participant FE as Front-end
    participant GPT as /interpret (GPT)
    participant API as /api/split
    participant SC as Stripe Checkout
    participant WH as Webhook

    U ->> FE: "Split the $120 bill between Alice and Bob"
    FE ->> GPT: { transcript }
    GPT -->> FE: { intent:"split_links", total, friends }
    FE ->> API: POST /api/split { total, friends }
    API ->> SC: create 2 Checkout Sessions
    SC -->> API: { url_A, url_B }
    API -->> FE: links[]
    FE ->> U: show modal + copy links to clipboard
    Note over U: Each friend pays separately
    SC -->> WH: payment_intent.succeeded (per friend)
    WH ->> DB: UPSERT row → timeline feed
```

### C.6 Share-calculation rules
* Base share = `floor(total / n)` cents.
* Any remainder (odd cents) is added **from the end of the array backwards** so the caller's early friends don't over-pay – implemented in `equalSplit()`.
* Negative or zero totals throw – validated at route layer.

Example: 100 ¢ among 3 ➜ `[33, 33, 34]`.

### C.7 Utterance table
| Pattern spoken | Parsed result |
|----------------|---------------|
| "Split 60 dollars with Alice and Bob" | equal split (2 × $30) |
| "I'll cover my half, have Bob and Carol pay the rest" | caller-covers mode (not yet implemented – future work) |
| "Divide 45 by three" | generic math ➜ `$15` each |

### C.8 Failure modes & guards
| Scenario | Prevention / Handling |
|----------|----------------------|
| Friend email missing | Checkout `customer_email` left blank → still works, but e-mail receipt skipped. |
| Odd cents (e.g. $0.01) | Remainder cent handed to last participant; totals still match. |
| Stripe API error | Express route catches & returns `500 split_failed` – FE shows `alert`. |

### C.9 Alternatives considered
| Design | Pros | Cons |
|--------|------|------|
| One Checkout Session with multiple line-items | Only 1 URL | Caller pays upfront, can't enforce individual payments |
| Payment Links API | No backend code | No automatic webhook → DB drift; limited metadata |
| Invoice per friend | Built-in reminders | Heavier flow; requires collecting postal address etc. |

### C.10 Front-end UX
* `SplitLinksDialog.jsx` modal lists **Name + Amount + Copy Link** per friend.
* Clipboard auto-populated with all URLs for quick paste into chat apps.
* Modal closes on **Close** button or background click.

### C.11 Test inventory
| Layer | Test file | What it covers |
|-------|-----------|----------------|
| Util  | `backend/tests/shareCalculator.test.js` | Even split & remainder logic |
| API   | `backend/tests/splitBillRoute.test.js` | 200 OK & 2 links returned |
| React | `frontend/__tests__/SplitLinksDialog.test.jsx` | Renders names & amounts; link copy |

---

### Appendix D Unified Confirmation Overlay (2025-06)

The June 2025 refactor collapsed the old two-modal flow (dark confirmation card → white result card) into a **single, stateful overlay**.

Highlights
* One visual component with two internal phases → eliminates flicker and styling drift.
* Accessibility: focus-trap, Esc to cancel, reduced-motion compliance.
* Consistent step badge (“Step 1 of 2” → “Step 2 of 2”) tells the user where they are.
* Auto-copies and opens the single Checkout link; split-bill still lists multiple links.
* Error phase with Retry / Cancel buttons reuses the same container.

Sequence diagram
```mermaid
sequenceDiagram
  participant User
  participant Mic as VoiceButton
  participant UI as UnifiedDialog
  participant API as /api/voice-confirm

  User->>Mic: hold + say "yes" / "no"
  Mic->>API: POST audio + payload
  API-->>Mic: { url } | { retry } | { cancelled }
  Mic-->>UI: linkObj | retry | cancel
  UI-->>User: morph to result / error / close
```

Take-away: consolidating feedback surfaces makes it **immediately obvious** which stage the voice flow is in and reduces the code we have to maintain.

---
