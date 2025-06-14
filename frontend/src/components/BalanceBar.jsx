import React from 'react';
import useBalance from '../hooks/useBalance.js';

export default function BalanceBar() {
  const { availableCents, pendingCents, loading } = useBalance();

  const fmt = (c) => (c != null ? (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'CAD' }) : '—');

  return (
    <div className="w-full max-w-md mx-auto mb-6 flex flex-col gap-4">
      {/* Available */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl p-4 shadow-lg text-center">
        <span className="text-sm opacity-80">Available</span>
        <div className="text-2xl font-black tracking-wide">
          {loading ? 'Loading…' : fmt(availableCents)}
        </div>
      </div>
      {/* Pending */}
      <div className="bg-gradient-to-r from-amber-400 to-amber-600 rounded-xl p-4 shadow-lg text-center">
        <span className="text-sm opacity-80">Pending</span>
        <div className="text-2xl font-black tracking-wide">
          {loading ? 'Loading…' : fmt(pendingCents)}
        </div>
      </div>
    </div>
  );
} 