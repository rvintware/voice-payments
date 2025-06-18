import { play as playAudioElem } from '../audio/AudioPlayer.js';

// In–browser cache: text ↦ objectURL of full MP3 so repeat prompts are instant.
const sentenceCache = new Map();

export default async function playSentence(text) {
  if (!text) return;

  // 1. Instant playback – if cached, reuse.
  if (sentenceCache.has(text)) {
    playAudioElem(Date.now().toString(), sentenceCache.get(text));
    return;
  }

  // 2. Stream via GET so the <audio> element starts as soon as headers arrive.
  const streamUrl = `http://localhost:4000/api/tts/say?${new URLSearchParams({ text })}`;
  playAudioElem(Date.now().toString(), streamUrl);

  // 3. In the background download full file once then cache as blob for the future.
  try {
    const res = await fetch(streamUrl);
    if (!res.ok) return; // ignore failures – user already heard the streamed audio
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    sentenceCache.set(text, objectUrl);
  } catch {
    // network error during background caching – no big deal.
  }
} 