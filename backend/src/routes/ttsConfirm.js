import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/tts/confirm', async (req, res) => {
  try {
    const { amountCents, name, recipientEmail } = req.body || {};
    if (!amountCents) {
      return res.status(400).json({ error: 'amountCents required' });
    }
    const finalName = name || (recipientEmail ? recipientEmail.split('@')[0] : null);
    if (!finalName) {
      return res.status(400).json({ error: 'name or recipientEmail required' });
    }
    const dollars = (amountCents / 100).toFixed(2);
    const inputText = `Send ${dollars} Canadian dollars to ${finalName}. Should I proceed?`;

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