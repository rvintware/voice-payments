import { useState, useEffect } from 'react';
import { getSocket } from './socketSingleton.js';

export default function useLiveTranscript() {
  const [text, setText] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    // Live captions currently disabled – streaming ASR path removed.
    return; // noop effect
  }, []);

  return { text, isFinal };
} 