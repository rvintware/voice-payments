/* eslint-disable no-undef */
// PCMDownsampler AudioWorkletProcessor
// Converts the input AudioBuffer (usually 44.1-kHz or 48-kHz float32) to
// 16-kHz mono 16-bit little-endian PCM.  It accumulates ~320-ms of audio
// (5 120 samples = 10 240 bytes) before emitting a chunk to the main thread.
// The main thread can then push these raw bytes over the existing
// WebSocket.

const TARGET_RATE = 16000; // Hz
const CHUNK_SAMPLES = TARGET_RATE * 0.32; // 5120 samples ≈ 320 ms
const CHUNK_BYTES   = CHUNK_SAMPLES * 2;  // int16 → 2 bytes
const HEADER_BYTES  = 12; // version(1) + type(1) + flags(2) + seq(4) + ts_ms(4)

class PCMDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    this._seq = 0;
    // Pre-alloc int16 view for max chunk to avoid GC churn.
    this._int16 = new Int16Array(CHUNK_SAMPLES);
    this._ratio = sampleRate / TARGET_RATE; // e.g. 48 000 / 16 000 = 3
  }

  /**
   * Down-sample by simple nearest-neighbour (good enough for speech).
   * More sophisticated sinc filters cost more CPU and aren't worth it
   * for telephone-quality voice commands.
   */
  _downSample(input) {
    const needed = Math.floor(input.length / this._ratio);
    const out = new Float32Array(needed);
    for (let i = 0; i < needed; i++) {
      out[i] = input[Math.floor(i * this._ratio)] || 0;
    }
    return out;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true; // no data

    // 1 channel only
    const chunk = input[0];
    const down = this._downSample(chunk);

    // Grow buffer and append
    const tmp = new Float32Array(this._buffer.length + down.length);
    tmp.set(this._buffer, 0);
    tmp.set(down, this._buffer.length);
    this._buffer = tmp;

    // While we have ≥ CHUNK_SAMPLES emit chunks
    while (this._buffer.length >= CHUNK_SAMPLES) {
      // Slice first 5120 samples
      const slice = this._buffer.subarray(0, CHUNK_SAMPLES);
      // Shift the remainder to new buffer
      this._buffer = this._buffer.subarray(CHUNK_SAMPLES);

      // Convert float32 → int16
      for (let i = 0; i < CHUNK_SAMPLES; i++) {
        // clamp * 0x7FFF
        const s = Math.max(-1, Math.min(1, slice[i]));
        this._int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const bytes = new Uint8Array(this._int16.buffer, 0, CHUNK_BYTES);

      const payload = new Uint8Array(HEADER_BYTES + CHUNK_BYTES);
      let offset = 0;
      // Header construction
      payload[offset++] = 0x01; // version
      payload[offset++] = 0x01; // type = audio_chunk
      // flags (uint16 LE) – currently 0x0000
      payload[offset++] = 0x00;
      payload[offset++] = 0x00;
      // seq (uint32 LE)
      const seq = this._seq >>> 0;
      payload[offset++] = seq & 0xff;
      payload[offset++] = (seq >> 8) & 0xff;
      payload[offset++] = (seq >> 16) & 0xff;
      payload[offset++] = (seq >> 24) & 0xff;
      // ts_ms (uint32 LE) – modulo 2^32
      const now = (currentTime * 1000) >>> 0; // currentTime is AudioContext time in seconds
      payload[offset++] = now & 0xff;
      payload[offset++] = (now >> 8) & 0xff;
      payload[offset++] = (now >> 16) & 0xff;
      payload[offset++] = (now >> 24) & 0xff;

      // PCM bytes
      payload.set(bytes, HEADER_BYTES);

      this.port.postMessage({ type: 'audio-chunk', payload });
      this._seq++;
    }
    return true;
  }
}

registerProcessor('pcm-downsampler', PCMDownsampler); 