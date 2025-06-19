import { describe, it, expect, vi } from 'vitest';
import { ConversationFSM } from '../src/conversation/fsm.js';

function makeFsm() {
  const events = [];
  const fsm = new ConversationFSM({ emit: (type, payload) => events.push({ type, ...payload }) });
  return { fsm, events };
}

describe('ConversationFSM (blob flow)', () => {
  it('happy info intent path', () => {
    const { fsm, events } = makeFsm();

    fsm.send('MIC_PRESS');
    expect(fsm.getState()).toBe('Recording');

    fsm.send({ type: 'RECORD_END', text: 'what is my balance' });
    expect(fsm.getState()).toBe('Thinking');

    fsm.send({ type: 'GPT_RESULT', risk: 'safe', sentence: 'Your balance is $20' });
    expect(fsm.getState()).toBe('Speaking');
    expect(events.at(-1).type).toBe('speak_sentence');

    fsm.send('TTS_END');
    expect(fsm.getState()).toBe('Idle');
  });

  it('money path with 8s timeout', () => {
    vi.useFakeTimers();
    const { fsm, events } = makeFsm();

    fsm.send('MIC_PRESS');
    fsm.send({ type: 'RECORD_END', text: 'send ten dollars to alice' });
    fsm.send({ type: 'GPT_RESULT', risk: 'money', sentence: 'Send $10 to Alice. Should I proceed?' });

    expect(fsm.getState()).toBe('ConfirmWait');
    expect(events.at(-1).type).toBe('confirm_request');

    // advance 8s to trigger timeout
    vi.advanceTimersByTime(8100);
    expect(fsm.getState()).toBe('Idle');
    expect(events.at(-2).type).toBe('confirm_cancelled');
    expect(events.at(-1).type).toBe('state_change');

    vi.useRealTimers();
  });

  it('speaking interrupted returns to Recording', () => {
    const { fsm } = makeFsm();
    fsm.send('MIC_PRESS');
    fsm.send({ type: 'RECORD_END', text: 'balance' });
    fsm.send({ type: 'GPT_RESULT', risk: 'safe', sentence: 'balance' });
    fsm.send('USER_INTERRUPT');
    expect(fsm.getState()).toBe('Recording');
  });

  it('unknown event ignored', () => {
    const { fsm } = makeFsm();
    fsm.send('MIC_PRESS');
    const prev = fsm.getState();
    fsm.send('FOO');
    expect(fsm.getState()).toBe(prev);
  });
}); 