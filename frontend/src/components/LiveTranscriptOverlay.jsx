import React from 'react';
import useLiveTranscript from '../conversation/useLiveTranscript.js';

export default function LiveTranscriptOverlay() {
  const { text } = useLiveTranscript();

  if (!text) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg max-w-[90vw] truncate">
      {text}
    </div>
  );
} 