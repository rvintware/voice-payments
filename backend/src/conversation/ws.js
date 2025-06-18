import { WebSocketServer } from 'ws';

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

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch (err) {
        // ignore malformed JSON for now
      }
    });
  });

  // eslint-disable-next-line no-console
  console.log('WebSocket layer attached at ws://localhost:4000/ws/session');
} 