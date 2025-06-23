import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { useBalance } from '../context/BalanceContext.jsx';
import playSentence from '../utils/playAudio.js';
import { pauseAll } from '../audio/AudioPlayer.js';
import { getSocket } from '../conversation/socketSingleton.js';

// Grace period (ms) after we receive an ASR "final" before stopping capture.
// For answer-mode confirmations we allow a much quicker press.
const GRACE_MS = 800; // long utterances (command mode)

export default function VoiceButton({ mode = 'command', onPaymentLink, answerPayload = {}, onCancel }) {
  const { availableCents, pendingCents } = useBalance();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(0);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);

      if (import.meta.env.VITE_INTERRUPTIONS_MVP === 'true') {
        pauseAll();
        fetch('http://localhost:4000/api/vad-interrupt', { method: 'POST' });
      }
    } catch (err) {
      console.error('Mic access error', err);
      alert('Microphone permission denied');
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;

    const durationMs = Date.now() - startTimeRef.current;
    // For command mode enforce GRACE_MS so very short presses are ignored.
    if (mode === 'command' && durationMs < GRACE_MS) {
      mediaRecorderRef.current.stop();
      alert('Hold the button a bit longer to record');
      setIsRecording(false);
      return;
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (mode === 'command') {
        // original flow
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        try {
          const vtRes = await fetch('http://localhost:4000/api/voice-to-text', {
            method: 'POST',
            body: formData,
          });
          const vtData = await vtRes.json();
          if (!vtRes.ok) {
            alert(vtData.error || 'Could not process command');
            return;
          }
          // Send transcript to interpret endpoint
          const body = { text: vtData.transcript };
          if (window.__vpSessionId) body.sessionId = window.__vpSessionId;
          const interpRes = await fetch('http://localhost:4000/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const interpData = await interpRes.json();

          if (!interpRes.ok) {
            alert(interpData.error || 'Could not understand command');
            return;
          }

          // New schema response handling
          if (interpData.speak) {
            try {
              await playSentence(interpData.speak);
            } catch {
              alert('Could not play speech');
            }
          }

          if (interpData.ui === 'link' && interpData.link) {
            try { await navigator.clipboard.writeText(interpData.link); } catch {}
            onPaymentLink?.('link', { url: interpData.link });
          } else if (interpData.ui === 'links' && Array.isArray(interpData.links)) {
            onPaymentLink?.('split', { links: interpData.links });
          } else if (interpData.ui === 'confirm' && interpData.speak) {
            // Some agent versions send confirm via HTTP instead of WS; normalise to WS event
            window.dispatchEvent(new CustomEvent('confirm_request', { detail: { sentence: interpData.speak } }));
          }

          // Early return – confirm requests continue to come via WS events
          return;
        } catch (err) {
          alert('Error contacting backend');
        }
      } else if (mode === 'answer') {
        // 1️⃣  Transcribe the confirmation reply via Whisper
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        try {
          const vtRes = await fetch('http://localhost:4000/api/voice-to-text', {
            method: 'POST',
            body: formData,
          });
          const vtData = await vtRes.json();
          if (!vtRes.ok) {
            alert(vtData.error || 'Could not process speech');
            return;
          }

          // 2️⃣  Pass the transcript back into the agent – it now sits in confirmation mode
          const body = { text: vtData.transcript };
          if (window.__vpSessionId) body.sessionId = window.__vpSessionId;
          const agentRes = await fetch('http://localhost:4000/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const agentData = await agentRes.json();
          if (!agentRes.ok) {
            alert(agentData.error || 'Backend error');
            return;
          }

          // 3️⃣  Handle deterministic agent response
          if (agentData.speak) {
            try { await playSentence(agentData.speak); } catch {/* ignore */}
          }

          if (agentData.ui === 'link' && agentData.link) {
            try { await navigator.clipboard.writeText(agentData.link); } catch {/* ignore */}
            onPaymentLink?.('link', { url: agentData.link });
          } else if (agentData.ui === 'links' && Array.isArray(agentData.links)) {
            onPaymentLink?.('split', { links: agentData.links });
          } else if (agentData.ui === 'confirm' && agentData.speak) {
            // Edge-case: agent may re-ask for confirmation if unsure
            window.dispatchEvent(new CustomEvent('confirm_request', { detail: { sentence: agentData.speak } }));
          }
        } catch (err) {
          alert('Error contacting backend');
        }
      }
    };
  }

  async function handleInterpret(transcriptText) {
    try {
      const interpRes = await fetch('http://localhost:4000/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText })
      });
      const interpData = await interpRes.json();
      if (!interpRes.ok) {
        alert(interpData.error || 'Could not understand command');
        return;
      }

      // Balance intent needs local cents values
      if (interpData.intent === 'query_balance') {
        const type = interpData.type;
        const cents =
          type === 'pending'
            ? pendingCents
            : type === 'available'
            ? availableCents
            : (pendingCents ?? 0) + (availableCents ?? 0);

        if (cents == null) {
          alert('Balance is still loading, please try again');
          return;
        }

        const dollars = (cents / 100).toFixed(2);
        try {
          await playSentence(`Your ${type} balance is ${dollars} Canadian dollars`);
          return;
        } catch {
          alert('Could not speak balance');
          return;
        }
      }

      // Handle money-moving flows that need explicit confirmation
      if (interpData.intent === 'confirm_request') {
        // UnifiedDialog/useTTS will handle speaking the confirmation sentence.
        onPaymentLink?.(null, { ...interpData, transcript: transcriptText });
        return;
      }

      if (interpData.intent === 'speak' && interpData.sentence) {
        try {
          await playSentence(interpData.sentence);
        } catch (err) {
          console.error('TTS playback error', err);
          alert('Could not play speech');
        }
        return;
      }
      // Additional intents (split_links, payment flows) can be wired later.
    } catch (err) {
      alert('Error contacting backend');
    }
  }

  // Allow holding the spacebar as a push-to-talk shortcut.
  useEffect(() => {
    function keyHandler(e) {
      if (e.code !== 'Space' || e.repeat || e.altKey || e.metaKey || e.ctrlKey) return;
      // Ignore if user is typing in an input element
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.type === 'keydown') {
        if (!isRecording) startRecording();
      } else if (e.type === 'keyup') {
        if (isRecording) stopRecording();
      }
      e.preventDefault(); // stop page scroll
    }

    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('keyup', keyHandler);
    };
    // isRecording included so handler has current value
  }, [isRecording]);

  return (
    <button
      className={`relative w-48 h-48 rounded-full bg-banking-purple transition shadow-2xl focus:outline-none
        ${isRecording ? 'animate-pulse' : 'hover:bg-purple-700 active:scale-95'}`}
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
    >
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-banking-purple opacity-25 animate-ping" />
      )}
      <FaMicrophone className="relative z-10 w-16 h-16 text-white" />
    </button>
  );
} 