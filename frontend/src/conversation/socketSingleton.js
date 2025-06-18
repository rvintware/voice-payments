// Singleton WebSocket used by the interruptions MVP so that
// React StrictMode double-mounts don't create multiple connections.
// import { getSocket } from './socketSingleton';

let socket;

export function getSocket() {
  if (socket) return socket;

  socket = new WebSocket('ws://localhost:5173/ws/session');

  socket.onopen = () => {
    console.log('[WS] open (singleton)');
    // Expose globally for DevTools tinkering once.
    window.ws = socket;
  };

  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      console.log('[WS] in', msg);
    } catch {
      console.log('[WS] raw', e.data);
    }
  };

  // Clean up when the tab closes
  window.addEventListener('beforeunload', () => socket.close());

  return socket;
} 