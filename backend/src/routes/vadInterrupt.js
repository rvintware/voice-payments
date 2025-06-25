import { Router } from 'express';
import { getFsm } from '../conversation/fsm.js';
import { broadcastPauseAudio } from '../conversation/ws.js';

const router = Router();

// Lightweight endpoint called by the browser when VAD detects the user
// speaking while TTS is playing. It replaces the old client→WS message.
router.post('/vad-interrupt', (req, res) => {
  try {
    // For demo we derive session id from remote address (same as ws.js)
    const sessionId = req.ip;
    const fsm = getFsm(sessionId, () => {});
    // Debug print – helps diagnose accidental VAD hits
    // eslint-disable-next-line no-console
    console.debug('[VAD interrupt]', { sessionId, state: fsm.state });
    // Only cancel TTS / restart recording if the FSM was actually speaking or
    // thinking. During ConfirmWait we must NOT send USER_INTERRUPT otherwise
    // it kicks the FSM back to Recording and breaks the yes/no flow.
    if (fsm.state === 'Speaking' || fsm.state === 'Thinking') {
      fsm.send('USER_INTERRUPT');
    }
    broadcastPauseAudio();
    return res.sendStatus(204);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('vad-interrupt error', err);
    return res.status(500).json({ error: 'vad_interrupt_failed' });
  }
});

export default router; 