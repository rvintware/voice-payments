import React from 'react';
import useBalance from '../hooks/useBalance.js';

export default function BalanceBar() {
  const { amountCents, loading } = useBalance();
  const dollars = amountCents != null ? (amountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl p-4 shadow-lg text-center">
        <span className="text-sm opacity-80">Balance</span>
        <div className="text-2xl font-black tracking-wide">
          {loading ? 'Loading…' : dollars}
        </div>
      </div>
    </div>
  );
} 