// Finite-State Machine for interruption-aware conversations.
// Milestone-04 skeleton – handles only the subset of states/events we need
// to gate "money" intents behind a confirmation step.
//
// State chart (subset):
//   Idle → Recording → Thinking → Speaking
//                      ⬑           ↘ USER_INTERRUPT
//              ConfirmWait ←─ Speaking (risk:money)
//
// Events handled: MIC_PRESS, USER_INTERRUPT, RECORD_END, GPT_RESULT,
// TTS_END, CONFIRM_TIMEOUT.
//
// The FSM is intentionally side-effect-free; callers supply callbacks
// (onTransition, emitWs) so that unit tests remain deterministic.

export class ConversationFSM {
  constructor({ emit }) {
    this.state = 'Idle';
    this.context = {};
    this.emit = emit; // function(type,payload)
    this._timeout = null;
  }

  send(event) {
    const { type } = typeof event === 'string' ? { type: event } : event;
    switch (this.state) {
      case 'Idle':
        if (type === 'MIC_PRESS') {
          this._transition('Recording');
        }
        break;
      case 'Recording':
        if (type === 'RECORD_END') {
          // Browser finished uploading blob and we have the transcript in payload
          this.context.transcript = event.text;
          this._transition('Thinking');
        } else if (type === 'USER_INTERRUPT') {
          // Already recording – ignore
        }
        break;
      case 'Thinking':
        if (type === 'GPT_RESULT') {
          const { risk, sentence } = event;
          if (risk === 'money') {
            this.context.pendingSentence = sentence;
            this._transition('ConfirmWait');
            this.emit('confirm_request', { sentence });
            // start 8-second confirmation timer
            this._timeout = setTimeout(() => this.send('CONFIRM_TIMEOUT'), 8000);
          } else {
            this.context.sentence = sentence;
            this._transition('Speaking');
            this.emit('speak_sentence', { sentence });
          }
        } else if (type === 'USER_INTERRUPT') {
          this._transition('Recording');
        }
        break;
      case 'Speaking':
        if (type === 'USER_INTERRUPT') {
          this.emit('pause_audio');
          this._transition('Recording');
        } else if (type === 'TTS_END') {
          this._transition('Idle');
        }
        break;
      case 'ConfirmWait':
        if (type === 'CONFIRM_TIMEOUT') {
          this.emit('confirm_cancelled');
          this._clearTimer();
          this._transition('Idle');
        } else if (type === 'USER_INTERRUPT') {
          this._clearTimer();
          this._transition('Recording');
        }
        break;
      default:
        // Unknown state
        break;
    }
  }

  _clearTimer() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  _transition(next) {
    // Clear any pending timer when leaving a state
    if (this.state === 'ConfirmWait') this._clearTimer();
    this.state = next;
    this.emit('state_change', { state: next });
  }

  getState() {
    return this.state;
  }
}

// Simple factory that keeps one FSM per session id. If a subsequent call
// supplies a *better* emitter (e.g. when the WebSocket attaches) upgrade the
// stored FSM so that future FSM events reach the correct output channel.
const fsms = new Map();
export function getFsm(sessionId, emit) {
  let fsm = fsms.get(sessionId);
  if (!fsm) {
    fsm = new ConversationFSM({ emit: emit || (() => {}) });
    fsms.set(sessionId, fsm);
  } else if (emit && emit !== fsm.emit) {
    fsm.emit = emit;
    // If we were already waiting for confirmation before the socket arrived, resend
    if (fsm.state === 'ConfirmWait' && fsm.context.pendingSentence) {
      fsm.emit('confirm_request', { sentence: fsm.context.pendingSentence });
    }
  }
  return fsm;
} 