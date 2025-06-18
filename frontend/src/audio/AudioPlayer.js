const players = new Map(); // id -> HTMLAudioElement

export function play(id, url) {
  let audio = players.get(id);
  if (!audio) {
    audio = new Audio(url);
    players.set(id, audio);
  }
  audio.play().catch(() => {/* ignore autoplay errors */});

  // Notify listeners that something started playing so VAD can engage.
  document.dispatchEvent(new CustomEvent('audio-playing'));
}

export function pauseAll() {
  players.forEach((a) => {
    if (!a.paused) a.pause();
  });
  document.dispatchEvent(new CustomEvent('audio-paused'));
}

export function isAnyPlaying() {
  for (const a of players.values()) {
    if (!a.paused) return true;
  }
  return false;
} 