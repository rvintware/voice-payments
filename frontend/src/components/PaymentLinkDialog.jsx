import React, { useEffect } from 'react';

export default function PaymentLinkDialog({ link, onClose }) {
  if (!link) return null;
  const { name, amount_cents: amountCents, currency = 'usd', url } = link;
  const prettyAmount = (amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

  // Auto-copy & auto-open once the dialog mounts
  useEffect(() => {
    if (!url) return;
    try {
      navigator.clipboard.writeText(url);
    } catch (err) {
      /* eslint-disable no-console */
      console.warn('Clipboard write failed');
    }
    // Open Checkout in new tab – non-blocking
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 animate-slide-up-fade">
        <h2 className="text-lg font-semibold mb-4">Payment Link</h2>
        <div className="flex items-center justify-between gap-2 mb-6">
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-gray-600">{prettyAmount}</p>
          </div>
          <button
            className="px-2 py-1 text-xs bg-banking-purple text-white rounded"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            Copy Link
          </button>
        </div>
        <button
          className="mt-4 px-4 py-2 bg-gray-200 rounded w-full"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
} 