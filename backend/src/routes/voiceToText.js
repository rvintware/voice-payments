import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: convert english number words up to 999 to integer
function wordsToNumber(str) {
  const units = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
  };
  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const tokens = str.toLowerCase().replace(/[^a-z\s-]/g, '').split(/\s+/);
  let total = 0;
  let current = 0;
  tokens.forEach(tok => {
    if (units[tok] !== undefined) {
      current += units[tok];
    } else if (tens[tok] !== undefined) {
      current += tens[tok];
    } else if (tok === 'hundred') {
      current *= 100;
    }
  });
  total += current;
  return total || null;
}

function extractAmountCents(transcript) {
  // Try numeric first
  const numMatch = transcript.match(/\d+(?:\.\d{1,2})?/);
  if (numMatch) {
    const dollars = parseFloat(numMatch[0]);
    return Math.round(dollars * 100);
  }
  // Fallback to word parsing for first phrase ending with 'dollar(s)' or entire string
  const wordAmount = wordsToNumber(transcript);
  if (wordAmount) return wordAmount * 100;
  return null;
}

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
