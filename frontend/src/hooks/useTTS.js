import { useEffect, useState } from 'react';

// Accepts null/undefined input without crashing. Destructure after defaulting.
export default function useTTS(input) {
  // Allow callers to pass `null` or `undefined` – treat both as an empty object
  const { amountCents, name, autoPlay = true } = (input ?? {});
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!autoPlay) return;
    if (!amountCents || !name) return;
    const controller = new AbortController();
    async function fetchTTS() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/api/tts/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountCents, name }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('TTS fetch failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTTS();
    return () => controller.abort();
  }, [amountCents, name, autoPlay]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play();
    return () => {
      audio.pause();
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return { loading, error };
} 