// Finite-State Machine for interruption-aware conversations.
// Milestone-04 skeleton – handles only the subset of states/events we need
// to gate "money" intents behind a confirmation step.
//
// State chart (subset):
//   Idle → Recording → Thinking → Speaking
//                      ⬑           ↘ USER_INTERRUPT
//              ConfirmWait ←─ Speaking (risk:money)
//
// Events handled: USER_INTERRUPT, TRANSCRIPT_FINAL, GPT_RESULT,
// CONFIRM_YES, CONFIRM_NO, TTS_END.
//
// The FSM is intentionally side-effect-free; callers supply callbacks
// (onTransition, emitWs) so that unit tests remain deterministic.

export class ConversationFSM {
  constructor({ emit }) {
    this.state = 'Idle';
    this.context = {};
    this.emit = emit; // function(type,payload)
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
        if (type === 'TRANSCRIPT_FINAL') {
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
        if (type === 'CONFIRM_YES') {
          this.emit('payment_confirmed');
          this._transition('Thinking'); // GPT will create payment → sentence
        } else if (type === 'CONFIRM_NO' || type === 'CONFIRM_TIMEOUT') {
          this.emit('confirm_cancelled');
          this._transition('Idle');
        } else if (type === 'USER_INTERRUPT') {
          this._transition('Recording');
        }
        break;
      default:
        // Unknown state
        break;
    }
  }

  _transition(next) {
    this.state = next;
    this.emit('state_change', { state: next });
  }
}

// Simple factory that keeps one FSM per session id
const fsms = new Map();
export function getFsm(sessionId, emit) {
  if (!fsms.has(sessionId)) {
    fsms.set(sessionId, new ConversationFSM({ emit }));
  }
  return fsms.get(sessionId);
} 