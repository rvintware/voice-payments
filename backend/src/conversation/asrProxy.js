import { WebSocket } from 'ws';

// Select provider via env var. Defaults to 'openai' for backward compatibility.
const PROVIDER = (process.env.ASR_PROVIDER || 'openai').toLowerCase();

// Deepgram constants (docs: https://developers.deepgram.com/reference/streaming)
const DG_WS_BASE =
  process.env.DEEPGRAM_AUDIO_WS ||
  // punctuation helps readability; sample_rate/encoding must match 16-kHz PCM we stream.
  'wss://api.deepgram.com/v1/listen?punctuate=true&encoding=linear16&sample_rate=16000';

// Realtime endpoint (June-2025 spec). If the env var overrides, we trust it.
const MODEL = process.env.OPENAI_AUDIO_MODEL || 'whisper-large-v3';
const OPENAI_WS =
  process.env.OPENAI_AUDIO_WS ||
  'wss://api.openai.com/v1/realtime?intent=transcription';

/**
 * A lightweight per-session relay that sends 16-kHz PCM frames to OpenAI's
 * streaming ASR WebSocket and forwards partial/final transcripts back to the
 * browser via the existing session socket.
 */
export class ASRProxy {
  /**
   * @param {import('ws').WebSocket} clientWs – the *browser* socket for this session
   */
  constructor(clientWs) {
    this.clientWs = clientWs;
    this.queue = [];
    this.ready = false;
    this._connect();
  }

  _connect() {
    // Connect to the selected upstream ASR vendor.
    if (PROVIDER === 'deepgram') {
      this._connectDeepgram();
    } else {
      // default: OpenAI Whisper
      this._connectOpenAI();
    }
  }

  /* ------------------------------------------------------------------
   * Provider-specific connection helpers
   * ---------------------------------------------------------------- */

  _connectOpenAI() {
    const headers = {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1', // required for realtime preview
    };

    console.log('[ASRProxy] connecting to OpenAI', OPENAI_WS);

    // Pass sub-protocol "realtime" required by beta.
    this.asrWs = new WebSocket(OPENAI_WS, 'realtime', { headers });

    this.asrWs.on('open', () => {
      // First frame: session update per OpenAI realtime docs.
      const init = {
        type: 'transcription_session.update',
        session: {
          input_audio_format: 'pcm16',
          input_audio_transcription: { model: MODEL },
          turn_detection: { type: 'server_vad' },
        },
      };
      this.asrWs.send(JSON.stringify(init));
      this._flushQueue();
    });

    this.asrWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'input_audio_transcription.partial') {
          this._safeSendBrowser({ type: 'transcript_partial', text: msg.text });
        }

        if (msg.type === 'input_audio_transcription.complete') {
          this._safeSendBrowser({ type: 'transcript_final', text: msg.text });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('ASRProxy parse error (OpenAI)', err);
      }
    });

    this.asrWs.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('OpenAI ASR WS error', err);
    });

    this.asrWs.on('close', () => {
      this.ready = false;
    });
  }

  _connectDeepgram() {
    const headers = {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
    };

    console.log('[ASRProxy] connecting to Deepgram', DG_WS_BASE);

    this.asrWs = new WebSocket(DG_WS_BASE, { headers });

    this.asrWs.on('open', () => {
      // Deepgram is ready immediately – just start streaming audio.
      this._flushQueue();
    });

    this.asrWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;

        const text = alt.transcript?.trim();
        if (!text) return; // ignore empty partials

        // Always emit partial so the overlay updates ASAP
        this._safeSendBrowser({ type: 'transcript_partial', text });

        // When Deepgram marks the utterance complete, also emit final.
        if (msg.is_final || msg.speech_final) {
          this._safeSendBrowser({ type: 'transcript_final', text });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('ASRProxy parse error (Deepgram)', err);
      }
    });

    this.asrWs.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Deepgram ASR WS error', err);
    });

    this.asrWs.on('close', () => {
      this.ready = false;
    });
  }

  _flushQueue() {
    this.ready = true;
    const pending = this.queue;
    this.queue = [];
    pending.forEach((buf) => this.handleFrame(buf));
  }

  /**
   * Handle a raw PCM frame coming from the browser.
   * Buffer until the upstream WS is open.
   * @param {Buffer|Uint8Array} frame
   */
  handleFrame(frame) {
    if (!this.asrWs || this.asrWs.readyState !== WebSocket.OPEN) {
      this.queue.push(frame);
      return;
    }

    if (PROVIDER === 'deepgram') {
      // Deepgram expects raw binary PCM frames.
      this.asrWs.send(frame);
    } else {
      // OpenAI expects base64-encoded PCM in JSON wrapper.
      const b64 = Buffer.from(frame).toString('base64');
      const payload = {
        type: 'input_audio_buffer.append',
        audio: b64,
      };
      this.asrWs.send(JSON.stringify(payload));
    }
  }

  _safeSendBrowser(obj) {
    try {
      if (this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.send(JSON.stringify(obj));
      }
    } catch {}
  }

  close() {
    try {
      this.asrWs?.close();
    } catch {}
  }
} 