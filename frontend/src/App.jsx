import React, { useState, useEffect } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import UnifiedDialog from './components/UnifiedDialog.jsx';
import BalanceBar from './components/BalanceBar.jsx';
import TransactionsFeed from './components/TransactionsFeed.jsx';
import SplitLinksDialog from './components/SplitLinksDialog.jsx';
import useConversationWS from './conversation/useConversationWS.js';
import useVAD from './conversation/useVAD.js';
import LiveTranscriptOverlay from './components/LiveTranscriptOverlay.jsx';

export default function App() {
  const [dialogPayload, setDialogPayload] = useState(null); // holds data for unified dialog
  const [splitData, setSplitData] = useState(null); // { links, sentence }

  // Initialise WebSocket for interruptions MVP (no UI impact)
  useConversationWS();
  // Initialise VAD for barge-in
  useVAD();

  // Listen for confirm_request events from FSM (via WS)
  useEffect(() => {
    function handler(e) {
      const { sentence } = e.detail || {};
      if (sentence) setDialogPayload({ sentence });
    }
    window.addEventListener('confirm_request', handler);
    return () => window.removeEventListener('confirm_request', handler);
  }, []);

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
      {/* Live transcript overlay for streaming ASR */}
      <LiveTranscriptOverlay />
    </main>
  );
}
