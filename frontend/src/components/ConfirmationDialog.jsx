import React from 'react';
import useTTS from '../hooks/useTTS.js';
import VoiceButton from './VoiceButton.jsx';

export default function ConfirmationDialog({ amountCents, recipientEmail, onPaymentLink, onCancel }) {
  if (!amountCents || !recipientEmail) return null;
  const name = recipientEmail.split('@')[0];
  const dollars = (amountCents / 100).toFixed(2);
  const { loading } = useTTS({ amountCents, name });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-banking-gray p-6 rounded-xl shadow-lg flex flex-col items-center gap-4 w-80 text-center">
        <p className="text-lg">I heard:</p>
        <p className="font-semibold text-banking-mint">Send ${dollars} to {name}</p>
        <p>Say "yes" to continue or "no" to cancel.</p>
        {loading ? (
          <span className="text-sm opacity-70">Generating voice…</span>
        ) : (
          <VoiceButton
            mode="answer"
            answerPayload={{ amountCents, recipientEmail }}
            onPaymentLink={(url) => {
              const linkObj = {
                name,
                amount_cents: amountCents,
                currency: 'usd',
                url,
              };
              onPaymentLink(linkObj);
            }}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
} 