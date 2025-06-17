import React, { useState } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import UnifiedDialog from './components/UnifiedDialog.jsx';
import BalanceBar from './components/BalanceBar.jsx';
import TransactionsFeed from './components/TransactionsFeed.jsx';
import SplitLinksDialog from './components/SplitLinksDialog.jsx';

export default function App() {
  const [dialogPayload, setDialogPayload] = useState(null); // holds data for unified dialog
  const [splitData, setSplitData] = useState(null); // { links, sentence }

  function handleCommand(kind, data) {
    if (kind === 'split') {
      setSplitData(data);
    } else if (data) {
      setDialogPayload(data);
    }
  }

  function closeDialog() {
    setDialogPayload(null);
  }

  return (
    <main className="flex flex-col items-center w-full min-h-screen gap-8 p-4">
      <h1 className="text-2xl font-semibold">Voice Payments MVP</h1>
      <BalanceBar />
      {!dialogPayload && !splitData && (
        <VoiceButton mode="command" onPaymentLink={handleCommand} />
      )}
      {dialogPayload && (
        <UnifiedDialog
          payload={dialogPayload}
          onClose={closeDialog}
          onCancel={closeDialog}
        />
      )}
      {/* Transaction history – infinite scroll */}
      <div className="w-full max-w-xl">
        <TransactionsFeed />
      </div>
      {splitData && (
        <SplitLinksDialog
          links={splitData.links}
          onClose={() => setSplitData(null)}
        />
      )}
    </main>
  );
}
