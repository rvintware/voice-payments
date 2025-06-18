import { WebSocketServer } from 'ws';
import { ASRProxy } from './asrProxy.js';

/**
 * Attaches a basic WebSocket server for the interruptions MVP. The socket
 * echoes a hello message on connect and replies `pong` to any `{type:'ping'}`
 * message. Further conversation‐related routing will be layered on later.
 * @param {import('http').Server} httpServer Node HTTP server instance
 */
export function attachWS(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/session' });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));

    // Attach per-socket ASR relay if flag enabled
    const streamingEnabled = process.env.STREAMING_ASR === 'true';
    let asr;
    if (streamingEnabled) {
      asr = new ASRProxy(ws);
    }

    ws.on('message', (data, isBinary) => {
      if (isBinary || data instanceof Buffer) {
        asr?.handleFrame(data);
        return;
      }

      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } else if (msg.type === 'vad_interrupt') {
          // Broadcast pause_audio to all sockets on this server
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({ type: 'pause_audio' }));
            }
          });
        }
      } catch {
        // ignore malformed JSON/binary
      }
    });

    ws.on('close', () => {
      asr?.close();
    });
  });

  // eslint-disable-next-line no-console
  console.log('WebSocket layer attached at ws://localhost:4000/ws/session');
} 