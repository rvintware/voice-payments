import { useEffect, useRef } from 'react';
import { getSocket } from './socketSingleton.js';
import { pauseAll } from '../audio/AudioPlayer.js';
import playSentence from '../utils/playAudio.js';

export default function useConversationWS() {
  const wsRef = useRef(null);

  useEffect(() => {
    // Always initialise the singleton WebSocket – no feature flag in dev.
    wsRef.current = getSocket();

    // Listen for server commands like pause_audio without clobbering existing listeners
    const handleMsg = (e) => {
      try {
        const msg = JSON.parse(e.data);
        // Cache session id announced by the server so HTTP calls can attach it.
        if (msg.type === 'hello' && msg.sessionId) {
          window.__vpSessionId = msg.sessionId;
          return; // nothing else to handle for hello
        }
        if (msg.type === 'pause_audio') {
          pauseAll();
        } else if (msg.type === 'confirm_request') {
          window.dispatchEvent(new CustomEvent('confirm_request', { detail: msg }));
        } else if (msg.type === 'speak_sentence' && msg.sentence) {
          playSentence(msg.sentence);
          // If the payload contains a payment link / links, forward it so the
          // dialog can transition to the "result" phase. Otherwise, treat it
          // as a simple spoken reply and close the confirmation flow.
          if (msg.url || msg.links) {
            window.dispatchEvent(new CustomEvent('payment_result', { detail: msg }));
          } else {
            window.dispatchEvent(new Event('confirm_done'));
          }
        } else if (msg.type === 'confirm_cancelled') {
          window.dispatchEvent(new Event('confirm_done'));
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