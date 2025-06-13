import React from 'react';
import useBalance from '../hooks/useBalance.js';

function MoneyCard({ label, subtitle, cents, gradient, loading }) {
  const dollars = cents != null ? (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'CAD' }) : '—';
  return (
    <div className={`flex-1 p-4 rounded-xl shadow-lg text-center bg-gradient-to-r ${gradient}`}>
      <span className="text-xs opacity-80 uppercase tracking-wide">{label}</span>
      <div className="text-2xl font-black tracking-wide">{loading ? 'Loading…' : dollars}</div>
      <span className="text-[10px] opacity-70">{subtitle}</span>
    </div>
  );
}

export default function BalanceCards() {
  const { available, pending, loading } = useBalance();
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-6">
      <MoneyCard label="Available" subtitle="Ready to spend" cents={available} gradient="from-emerald-500 to-emerald-700" loading={loading} />
      <MoneyCard label="Pending" subtitle="Arrives in 1–2 days" cents={pending} gradient="from-amber-400 to-amber-600" loading={loading} />
    </div>
  );
} 