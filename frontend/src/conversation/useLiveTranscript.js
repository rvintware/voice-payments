import { useState, useEffect } from 'react';
import { getSocket } from './socketSingleton.js';

export default function useLiveTranscript() {
  const [text, setText] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_STREAMING_ASR !== 'true') return;
    const ws = getSocket();

    function handler(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'transcript_partial') {
          setText(msg.text);
          setIsFinal(false);
        } else if (msg.type === 'transcript_final') {
          setText(msg.text);
          setIsFinal(true);
          // Clear after 2 s so the UI fades out automatically
          setTimeout(() => setText(''), 2000);
        }
      } catch {
        /* ignore non-json */
      }
    }
    ws.addEventListener('message', handler);

    return () => ws.removeEventListener('message', handler);
  }, []);

  return { text, isFinal };
} 