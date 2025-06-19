import { useEffect, useRef } from 'react';
import { getSocket } from './socketSingleton.js';
import { pauseAll } from '../audio/AudioPlayer.js';
import playSentence from '../utils/playAudio.js';

export default function useConversationWS() {
  const wsRef = useRef(null);

  useEffect(() => {
    if (import.meta.env.VITE_INTERRUPTIONS_MVP !== 'true') return;
    wsRef.current = getSocket();

    // Listen for server commands like pause_audio without clobbering existing listeners
    const handleMsg = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'pause_audio') {
          pauseAll();
        } else if (msg.type === 'confirm_request') {
          window.dispatchEvent(new CustomEvent('confirm_request', { detail: msg }));
        } else if (msg.type === 'speak_sentence' && msg.sentence) {
          playSentence(msg.sentence);
        }
      } catch {
        /* ignore invalid json */
      }
    };
    wsRef.current.addEventListener('message', handleMsg);

    // cleanup listener on unmount
    return () => wsRef.current?.removeEventListener('message', handleMsg);
  }, []);

  return {
    send: (obj) => getSocket().send(JSON.stringify(obj)),
  };
} 