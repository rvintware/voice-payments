import { useEffect, useRef } from 'react';
import { getSocket } from '../conversation/socketSingleton.js';

// Hook: useMicStream
// When `active` is true, captures mic input, down-samples to 16-kHz 16-bit PCM via
// an AudioWorklet and streams ~320-ms binary frames over the existing
// WebSocket. Returns a `stop()` function through the mutable ref so callers can
// shut down the pipeline early.
export default function useMicStream(active) {
  const stopRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let audioContext;
    let workletNode;
    let micStream;

    const socket = getSocket();
    // Ensure we can send binary
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.binaryType = 'arraybuffer';
      socket.addEventListener('open', () => {
        socket.binaryType = 'arraybuffer';
      });
    } else {
      socket.binaryType = 'arraybuffer';
    }

    async function init() {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext({ sampleRate: 48000 });

        // Worklet registration – Vite bundles static assets, so we can import via URL
        await audioContext.audioWorklet.addModule(
          new URL('./pcmWorklet.js', import.meta.url)
        );

        workletNode = new AudioWorkletNode(audioContext, 'pcm-downsampler');
        const MAX_BUFFERED = 256 * 1024; // 256 KB leaky bucket cap

        workletNode.port.onmessage = ({ data }) => {
          if (data?.type !== 'audio-chunk') return;

          // Back-pressure check: drop if backlog too big
          if (socket.bufferedAmount > MAX_BUFFERED) {
            // Optional: could post metric or debug log here
            return;
          }

          socket.send(data.payload);
        };

        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(workletNode);
      } catch (err) {
        console.error('[MicStream] failed to init', err);
      }
    }

    init();

    stopRef.current = () => {
      try {
        micStream?.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        workletNode?.port.postMessage({ type: 'stop' });
        workletNode?.disconnect();
      } catch {}
      try {
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch {}
    };

    // Cleanup on unmount or when active false
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [active]);

  return stopRef;
} 