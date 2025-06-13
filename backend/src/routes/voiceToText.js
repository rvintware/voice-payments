import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractAmountCents } from '../utils/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/voice-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Write buffer to a temp file because openai SDK expects a file or stream
    const tempPath = path.join(__dirname, `temp-${Date.now()}.webm`);
    fs.writeFileSync(tempPath, req.file.buffer);

    const openai = new OpenAI(); // picks up OPENAI_API_KEY from env

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });

    fs.unlinkSync(tempPath); // clean up

    const transcript = transcription.text;
    const amountCents = extractAmountCents(transcript);

    if (!amountCents) {
      return res.status(422).json({ error: 'Could not extract amount', transcript });
    }

    res.json({ transcript, amountCents });
  } catch (err) {
    console.error('Whisper error', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;
