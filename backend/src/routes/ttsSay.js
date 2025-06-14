import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/tts/say', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });

    const openai = new OpenAI();
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      format: 'mp3',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.error('TTS say error', err);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router; 