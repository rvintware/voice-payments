import { useEffect, useRef } from 'react';
import { getSocket } from './socketSingleton.js';
import { pauseAll } from '../audio/AudioPlayer.js';

export default function useConversationWS() {
  const wsRef = useRef(null);

  useEffect(() => {
    if (import.meta.env.VITE_INTERRUPTIONS_MVP !== 'true') return;
    wsRef.current = getSocket();

    // Listen for server commands like pause_audio without clobbering existing listeners
    const handleMsg = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'pause_audio') pauseAll();
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