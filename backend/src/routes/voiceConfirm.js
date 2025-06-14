import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseYesNo } from '../utils/parser.js';
import Stripe from 'stripe';

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
    if (!decision) {
      return res.json({ retry: true });
    }
    if (decision === 'no') {
      return res.json({ cancelled: true });
    }

    // yes path – delegate to existing createPayment router logic
    // assume body carries amountCents and email from query params
    const { amountCents, recipientEmail } = req.body || {};
    if (!amountCents || !recipientEmail) {
      return res.status(400).json({ error: 'amountCents and recipientEmail required' });
    }

    // Use stripe instance directly (import stripe from createPayment?)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: recipientEmail,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: `Payment to ${recipientEmail}` },
            unit_amount: Number(amountCents),
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Voice confirm error', err);
    res.status(500).json({ error: 'Failed to process confirmation' });
  }
});

export default router; 