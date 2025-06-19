import { useEffect } from 'react';
import vad from 'voice-activity-detection';
import { pauseAll, isAnyPlaying } from '../audio/AudioPlayer.js';
import { getSocket } from './socketSingleton.js';

// Hook sets up Voice Activity Detection while audio is playing. On speechStart
// it pauses all audio and notifies the server.
export default function useVAD() {
  useEffect(() => {
    if (import.meta.env.VITE_INTERRUPTIONS_MVP !== 'true') return;
    let stop;

    async function init() {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stop = vad(stream, {
          onSpeechStart: () => {
            if (!isAnyPlaying()) return; // ignore if nothing to interrupt
            pauseAll();
            fetch('http://localhost:4000/api/vad-interrupt', { method: 'POST' });
          },
          onSpeechEnd: () => {},
          interval: 50,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('VAD init failed', err);
      }
    }

    // Only start VAD when some audio is playing; listen for custom event
    function maybeStart() {
      if (!stop && isAnyPlaying()) init();
    }
    document.addEventListener('audio-playing', maybeStart);
    maybeStart();

    return () => {
      document.removeEventListener('audio-playing', maybeStart);
      if (stop) stop();
    };
  }, []);
} 