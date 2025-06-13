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
