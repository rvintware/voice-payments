import React from 'react';
import useBalance from '../hooks/useBalance.js';

export default function BalanceBar() {
  const { available, loading, error } = useBalance();

  if (loading) return <span>Loading…</span>;
  if (error) return <span>Error loading balance</span>;

  const dollars = (available / 100).toLocaleString('en-US', { style: 'currency', currency: 'CAD' });
  return <div>{dollars}</div>;
} 