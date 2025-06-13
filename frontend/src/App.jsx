import React, { useState } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import PaymentResult from './components/PaymentResult.jsx';

export default function App() {
  const [link, setLink] = useState(null);

  return (
    <main className="flex flex-col items-center justify-center w-full min-h-screen gap-8 p-4">
      <h1 className="text-2xl font-semibold">Voice Payments MVP</h1>
      <VoiceButton onPaymentLink={setLink} />
      <PaymentResult url={link} />
    </main>
  );
}
