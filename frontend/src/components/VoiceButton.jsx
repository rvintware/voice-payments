import React, { useState, useRef } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { useBalance } from '../context/BalanceContext.jsx';
import playSentence from '../utils/playAudio.js';

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
    } catch (err) {
      console.error('Mic access error', err);
      alert('Microphone permission denied');
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;

    const durationMs = Date.now() - startTimeRef.current;
    if (durationMs < 400) {
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
          const interpRes = await fetch('http://localhost:4000/api/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: vtData.transcript }),
          });
          const interpData = await interpRes.json();

          if (!interpRes.ok) {
            alert(interpData.error || 'Could not understand command');
            return;
          }

          // Check for balance intent
          if (interpData.intent === 'query_balance') {
            const type = interpData.type;
            const cents = type === 'pending'
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
              const ttsRes = await fetch('http://localhost:4000/api/tts/say', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `Your ${type} balance is ${dollars} Canadian dollars` }),
              });
              const blob = await ttsRes.blob();
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.play();
              return; // Do not proceed to payment flow
            } catch (err) {
              alert('Could not speak balance');
              return;
            }
          }

          // After we get interpData
          if (interpData.intent === 'speak' && interpData.sentence) {
            try {
              await playSentence(interpData.sentence);
            } catch (err) {
              console.error('TTS playback error', err);
              alert('Could not play speech');
            }
            return;
          }

          // After speak intent handling block
          if (interpData.intent === 'split_links' && interpData.links) {
            try {
              await navigator.clipboard.writeText(interpData.links.map(l => l.url).join('\n'));
            } catch (err) {
              /* eslint-disable no-console */
              console.warn('Clipboard write failed');
            }
            onPaymentLink?.('split', interpData);
            return;
          }

          // Hand over to confirmation dialog via callback if payment intent
          if (interpData.amountCents && interpData.recipientEmail) {
            onPaymentLink?.(null, { ...interpData, transcript: vtData.transcript });
          }
        } catch (err) {
          alert('Error contacting backend');
        }
      } else if (mode === 'answer') {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        formData.append('amountCents', answerPayload.amountCents);
        formData.append('recipientEmail', answerPayload.recipientEmail);
        try {
          const res = await fetch('http://localhost:4000/api/voice-confirm', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.url) {
            onPaymentLink?.(data.url);
          } else if (data.cancelled) {
            alert('Payment cancelled');
            onCancel?.();
          } else if (data.retry) {
            alert('I did not catch that, please try again');
          }
        } catch (err) {
          alert('Error contacting backend');
        }
      }
    };
  }

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