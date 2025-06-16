import React from 'react';

export default function SplitLinksDialog({ links = [], onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 animate-slide-up-fade">
        <h2 className="text-lg font-semibold mb-4">Payment Links</h2>
        <ul className="space-y-3 max-h-64 overflow-y-auto">
          {links.map((l) => (
            <li key={l.url} className="flex items-center justify-between gap-2 border-b pb-2">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-gray-600">{(l.amount_cents / 100).toLocaleString(undefined, { style: 'currency', currency: l.currency?.toUpperCase() || 'USD' })}</p>
              </div>
              <button
                className="px-2 py-1 text-xs bg-banking-purple text-white rounded"
                onClick={() => navigator.clipboard.writeText(l.url)}
              >
                Copy Link
              </button>
            </li>
          ))}
        </ul>
        <button className="mt-4 px-4 py-2 bg-gray-200 rounded w-full" onClick={onClose}>Close</button>
      </div>
    </div>
  );
} 