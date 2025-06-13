import React from 'react';

export default function PaymentResult({ url }) {
  if (!url) return null;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    });
  }

  return (
    <div className="w-full max-w-md p-4 bg-banking-gray rounded-lg shadow-lg animate-slide-up flex flex-col gap-2">
      <span className="text-banking-mint font-semibold">Payment Ready</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm underline"
      >
        {url}
      </a>
      <button
        className="self-start mt-2 px-3 py-1 text-sm bg-banking-purple hover:bg-purple-700 rounded"
        onClick={copy}
      >
        Copy Link ↗
      </button>
    </div>
  );
} 