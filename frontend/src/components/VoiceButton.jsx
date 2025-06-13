import React, { useState, useRef } from 'react';
import { FaMicrophone } from 'react-icons/fa';

export default function VoiceButton({ onPaymentLink }) {
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
      // Too short – discard to avoid Whisper 0.1s error
      mediaRecorderRef.current.stop(); // still stop to release stream
      alert('Hold the button a bit longer to record');
      setIsRecording(false);
      return;
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // Build FormData for voice-to-text
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');

      try {
        const vtRes = await fetch('http://localhost:4000/api/voice-to-text', {
          method: 'POST',
          body: formData,
        });
        const vtData = await vtRes.json();
        if (!vtRes.ok) {
          console.error(vtData);
          alert(vtData.error || 'Transcription failed');
          return;
        }

        const { amountCents, transcript } = vtData;
        console.log('Transcript:', transcript, 'Amount cents:', amountCents);

        // Now create payment link
        const payRes = await fetch('http://localhost:4000/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountCents }),
        });
        const payData = await payRes.json();
        if (payData.url) {
          onPaymentLink?.(payData.url);
        } else {
          alert('Payment link not generated');
        }
      } catch (error) {
        console.error(error);
        alert('Error contacting backend');
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