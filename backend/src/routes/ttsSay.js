import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();
const cache = new Map(); // text -> Buffer (mp3)

async function generateAndStream(text, res) {
  // If cached, return immediately
  if (cache.has(text)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.end(cache.get(text));
    return;
  }

  try {
    const openai = new OpenAI();
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      format: 'mp3',
      stream: true,
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    const chunks = [];
    response.body.on('data', (c) => chunks.push(c));
    response.body.on('end', () => {
      cache.set(text, Buffer.concat(chunks));
    });
    response.body.pipe(res);
  } catch (err) {
    console.error('TTS say error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate speech' });
    } else {
      res.end();
    }
  }
}

// GET /tts/say?text=hello
router.get('/tts/say', async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'text required' });
  await generateAndStream(String(text), res);
});

// Keep POST for backward-compatibility
router.post('/tts/say', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  await generateAndStream(String(text), res);
});

export default router; 