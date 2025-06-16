import React, { useState } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import PaymentLinkDialog from './components/PaymentLinkDialog.jsx';
import ConfirmationDialog from './components/ConfirmationDialog.jsx';
import BalanceBar from './components/BalanceBar.jsx';
import TransactionsFeed from './components/TransactionsFeed.jsx';
import SplitLinksDialog from './components/SplitLinksDialog.jsx';

export default function App() {
  const [paymentLink, setPaymentLink] = useState(null); // will hold link object
  const [commandData, setCommandData] = useState(null); // payment intent command
  const [splitData, setSplitData] = useState(null); // { links, sentence }

  function handleCommand(kind, data) {
    if (kind === 'split') {
      setSplitData(data);
    } else if (data) {
      setCommandData(data);
    }
  }

  function reset() {
    setCommandData(null);
    setPaymentLink(null);
  }

  return (
    <main className="flex flex-col items-center justify-center w-full min-h-screen gap-8 p-4">
      <h1 className="text-2xl font-semibold">Voice Payments MVP</h1>
      <BalanceBar />
      {!commandData && !splitData && (
        <VoiceButton mode="command" onPaymentLink={handleCommand} />
      )}
      {commandData && !paymentLink && (
        <ConfirmationDialog
          amountCents={commandData.amountCents}
          recipientEmail={commandData.recipientEmail}
          onPaymentLink={(linkObj) => setPaymentLink(linkObj)}
          onCancel={reset}
        />
      )}
      {splitData && <SplitLinksDialog links={splitData.links} onClose={() => setSplitData(null)} />}
      {paymentLink && (
        <PaymentLinkDialog link={paymentLink} onClose={() => setPaymentLink(null)} />
      )}
      <TransactionsFeed />
    </main>
  );
}
