import { play as playAudioElem } from '../audio/AudioPlayer.js';
const cache = new Map();

export default async function playSentence(text) {
  if (!text) return;

  // Return cached blob if exists
  let blob = cache.get(text);
  if (!blob) {
    const res = await fetch('http://localhost:4000/api/tts/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('TTS request failed');
    blob = await res.blob();
    cache.set(text, blob);
  }

  const url = URL.createObjectURL(blob);
  playAudioElem(Date.now().toString(), url);
} 