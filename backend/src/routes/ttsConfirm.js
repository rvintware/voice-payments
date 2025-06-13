import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/tts/confirm', async (req, res) => {
  try {
    const { amountCents, name } = req.body || {};
    if (!amountCents || !name) {
      return res.status(400).json({ error: 'amountCents and name required' });
    }
    const dollars = (amountCents / 100).toFixed(2);
    const inputText = `Send ${dollars} dollars to ${name}. Should I proceed?`;

    const openai = new OpenAI();
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: inputText,
      format: 'mp3',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.error('TTS error', err);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router; 