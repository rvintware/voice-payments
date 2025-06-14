# Voice Payments – Frontend

A minimal React + Vite + Tailwind project that showcases the voice-first payment UI described in `docs/voice-payment-prototype.md`.

## Prerequisites

• Node.js 18 or later
• npm (comes with Node) or pnpm / yarn as you prefer

## Getting started

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server (hot reload):

```bash
npm run dev
```

3. Open your browser at the URL shown in the terminal (typically http://localhost:5173).

You should see a dark screen with a large purple microphone button that pulses while pressed.

## Project structure

```
frontend/
  ├─ index.html          # Vite entry point
  ├─ package.json        # dependencies & scripts
  ├─ vite.config.js      # Vite + React plugin config
  ├─ tailwind.config.js  # Design tokens
  ├─ postcss.config.js   # Tailwind → Autoprefixer
  └─ src/
      ├─ main.jsx        # React root
      ├─ App.jsx         # App shell
      ├─ index.css       # Tailwind directives
      └─ components/
          └─ VoiceButton.jsx  # Pulsing mic button
```

## Next steps

• Wire `VoiceButton` to browser MediaRecorder for real audio capture.
• Add `TranscriptDisplay`, `StatusMessage`, and `PaymentResult` components.
• Connect to your backend API once it is ready.

Happy hacking!

## Tips
• Hold the mic for at least half a second so the audio isn't rejected for being too short.
• Say the amount in digits ("20 dollars") or clear words ("twenty dollars").

## Voice confirmation flow (Iteration 2)
1. Hold mic and say e.g. "Send twenty dollars to Teja".
2. Backend transcribes, extracts amount + recipient, returns JSON.
3. UI shows modal + plays OpenAI Alloy TTS: "Send twenty dollars to Teja. Should I proceed?".
4. Hold mic again, say "yes" or "no".
   * yes → Stripe Checkout session is created, link card appears.
   * no  → flow cancels.

Routes:
* `POST /api/voice-to-text` – multipart audio → `{ amountCents, name, email }`.
* `POST /api/tts/confirm` – `{ amountCents, name }` → MP3 stream.
* `POST /api/voice-confirm` – multipart audio + fields → `{ url } | { cancelled } | { retry }`.

## Running all tests
```
# backend
cd backend && npm test
# frontend
cd ../frontend && npm test
```
The GitHub Action `CI` runs these same commands on every PR.

---

## Why Voice Payments?

**Money should move at the speed of conversation.** Paying someone today still requires typing names, emails, amounts or scanning QR codes. Voice removes that friction:

* **Hands-free convenience** – great on mobile or while multitasking.
* **Accessibility** – empowers users with motor or visual impairments.
* **Faster checkout** – speaking "send twenty dollars to Anya" is ~3× quicker than tapping through forms.
* **Human-centred UX** – conversation is the oldest UI; it feels natural and builds trust.

---

## Architecture Overview

```mermaid
flowchart LR
  subgraph Frontend (React)
    VB[VoiceButton]\n(MediaRecorder)
    CD[ConfirmationDialog]\n(TTS + yes/no)
    PR[PaymentResult]\n(Link card)
    BAL[BalanceBar]\n(Stripe polling)
  end

  subgraph Backend (Express)
    VT((/voice-to-text))
    INT((/interpret))
    TTS((/tts/confirm))
    VC((/voice-confirm))
    BALR((/balance))
  end

  VB -- audio --> VT
  VT -- transcript --> INT
  INT -- intent JSON --> CD
  CD -- TTS req --> TTS
  CD -- yes/no audio --> VC
  VC -- Checkout URL --> PR
  BALR -- CAD cents --> BAL
```

* **Speech layer** – Browser MediaRecorder → Whisper (ASR) & TTS-1 "Alloy".
* **Intent layer** – GPT-3.5 function-calling returns `amount_cents` + `recipient_email`.
* **Payment layer** – Stripe Checkout handles PCI compliance; the backend never touches card data.
* **State layer** – `/balance` merges Stripe **available** & **pending** arrays so the UI can show both.

---

## Feature Matrix

| Category | Feature | Details |
|----------|---------|---------|
| Commands | Natural-language payments | "Pay Sarah fifty bucks", "Send 20 CAD to trevor" |
| Confirmation | Alloy TTS prompt + voice yes/no | Prevents accidental transfers |
| Payments | Stripe Checkout (CAD) | Customer-email pre-filled, success/cancel URLs |
| Balance | Available + Pending totals | Polls every 30 s, colour-coded cards |
| Error handling | Voice length, parse failure, retry loop | Friendly alerts & retry pathways |
| Accessibility | Keyboard trigger, colour contrast, screen-reader labels | WIP |

**Edge-cases handled**

* Empty/mumbled audio (<400 ms) – prompts user to hold longer.
* Missing "@" in recipient – `normalizeRecipient()` appends `@gmail.com`.
* Ambiguous yes/no – backend responds `{ retry: true }` so UI asks again.
* Unsupported currency words – flow aborts with clear error.

---

## REST API Reference

| Method | Path | Body | Success Response |
|--------|------|------|------------------|
| POST | `/api/voice-to-text` | `FormData { audio: WebM }` | `{ transcript }` |
| POST | `/api/interpret` | `{ transcript }` | `{ amountCents, recipientEmail }` |
| POST | `/api/tts/confirm` | `{ amountCents, name? }` | `audio/mpeg` stream |
| POST | `/api/voice-confirm` | `FormData { audio, amountCents, recipientEmail }` | `{ url } \| { cancelled } \| { retry }` |
| GET  | `/api/balance` | — | `{ availableCents, pendingCents }` |

All endpoints live under `http://localhost:4000/api` in dev. Authentication/rate-limiting are stubbed out for brevity.

---

## Developer Experience & Tooling

* **Monorepo** with separate `frontend` and `backend` workspaces.
* **Vitest** for unit tests on both sides; GitHub Actions runs `npm test` matrices.
* **Prettier + ESLint** (coming soon) ensure code style; run `npm run lint --fix`.
* **Docker** – one-liner spin-up:

  ```bash
  docker compose up --build
  ```

  The compose file starts Postgres (for future extensions), Express API, and Vite dev server behind Caddy for HTTPS.
* **.env.example** enumerates all secrets so new devs can start quickly.

---

## Contributing

1. Fork ➜ feature branch ➜ PR to `main`.
2. `npm run test` must pass and `npm run lint` must produce no errors.
3. Write or update **at least one test** for every bug fix or feature.
4. Use conventional commits (`feat:`, `fix:`, etc.) so the changelog stays clean.

---

## Code of Conduct

Be kind, inclusive, and constructive. Harassment or discriminatory language are not tolerated. By participating you agree to uphold the etiquette in the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## License

Released under the **MIT License** (see `LICENSE`). You may reuse the code under the terms but **no warranty is provided**. The voice payments concept is intended for educational and demonstration purposes only.
