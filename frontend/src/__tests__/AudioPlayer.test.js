import { describe, it, expect, vi, beforeEach } from 'vitest';

// JSDOM doesn't actually play audio; we stub HTMLAudioElement
class FakeAudio {
  constructor() {
    this.paused = true;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

global.Audio = FakeAudio;

import { play, pauseAll, isAnyPlaying } from '../audio/AudioPlayer.js';

describe('AudioPlayer utility', () => {
  beforeEach(() => {
    // Ensure no leftover listeners
  });

  it('dispatches "audio-playing" event when play is called', () => {
    const spy = vi.fn();
    document.addEventListener('audio-playing', spy);
    play('1', 'http://example.com/test.mp3');
    expect(spy).toHaveBeenCalled();
    document.removeEventListener('audio-playing', spy);
  });

  it('dispatches "audio-paused" event when pauseAll is called', () => {
    const spy = vi.fn();
    document.addEventListener('audio-paused', spy);
    play('2', 'http://example.com/test2.mp3');
    pauseAll();
    expect(spy).toHaveBeenCalled();
    document.removeEventListener('audio-paused', spy);
  });

  it('isAnyPlaying reports correctly', () => {
    // Ensure state: nothing playing
    pauseAll();
    expect(isAnyPlaying()).toBe(false);

    play('3', 'http://example.com/test3.mp3');
    expect(isAnyPlaying()).toBe(true);
    pauseAll();
    expect(isAnyPlaying()).toBe(false);
  });
}); 