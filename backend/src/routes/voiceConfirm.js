import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseYesNo } from '../utils/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/voice-confirm', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio' });

    const tempPath = path.join(__dirname, `confirm-${Date.now()}.webm`);
    fs.writeFileSync(tempPath, req.file.buffer);

    const openai = new OpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });
    fs.unlinkSync(tempPath);

    const decision = parseYesNo(transcription.text || '');

    // Bail out if unsure what was said
    if (!decision) {
      return res.json({ retry: true });
    }

    // If affirmative, create the Stripe Checkout session immediately so the
    // browser gets the URL in one round-trip (no extra WS hop).
    if (decision === 'yes') {
      const amountCents = Number(req.body?.amountCents);
      const recipientEmail = req.body?.recipientEmail;

      if (!amountCents || !recipientEmail) {
        return res.status(400).json({ error: 'missing_payment_context' });
      }

      // Re-use the existing internal route – avoids duplicating Stripe code.
      const createRes = await fetch('http://localhost:4000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, recipientEmail })
      });
      const json = await createRes.json();
      if (!createRes.ok) {
        return res.status(500).json({ error: 'payment_failed' });
      }
      return res.json({ decision: 'yes', url: json.url });
    }

    // Negative answer – just echo it.
    return res.json({ decision: 'no' });
  } catch (err) {
    console.error('Voice confirm error', err);
    res.status(500).json({ error: 'Failed to process confirmation' });
  }
});

export default router; 