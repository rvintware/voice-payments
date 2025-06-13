import React, { useState } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import PaymentResult from './components/PaymentResult.jsx';
import ConfirmationDialog from './components/ConfirmationDialog.jsx';

export default function App() {
  const [paymentLink, setPaymentLink] = useState(null);
  const [commandData, setCommandData] = useState(null); // {amountCents,name,email}

  function handleCommand(_, data) {
    // data contains amountCents,name,email from voice-to-text
    if (data) setCommandData(data);
  }

  function reset() {
    setCommandData(null);
    setPaymentLink(null);
  }

  return (
    <main className="flex flex-col items-center justify-center w-full min-h-screen gap-8 p-4">
      <h1 className="text-2xl font-semibold">Voice Payments MVP</h1>
      {!commandData && (
        <VoiceButton mode="command" onPaymentLink={handleCommand} />
      )}
      {commandData && !paymentLink && (
        <ConfirmationDialog
          amountCents={commandData.amountCents}
          name={commandData.name}
          email={commandData.email}
          onPaymentLink={(url) => setPaymentLink(url)}
          onCancel={reset}
        />
      )}
      <PaymentResult url={paymentLink} />
    </main>
  );
}
