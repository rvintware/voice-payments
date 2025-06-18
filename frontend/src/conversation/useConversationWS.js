import { useEffect, useRef } from 'react';
import { getSocket } from './socketSingleton.js';

export default function useConversationWS() {
  const wsRef = useRef(null);

  useEffect(() => {
    if (import.meta.env.VITE_INTERRUPTIONS_MVP !== 'true') return;
    wsRef.current = getSocket();
  }, []);

  return {
    send: (obj) => getSocket().send(JSON.stringify(obj)),
  };
} 