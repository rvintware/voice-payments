export function formatList(rows) {
  if (!rows.length) return 'No matching transactions found.';
  const parts = rows.map((tx) => {
    const amount = (tx.amount / 100).toFixed(2);
    const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric'
    });
    return `${amount} ${tx.currency.toUpperCase()} on ${dateStr}`;
  });
  return `Here are the latest ${rows.length} transactions: ${parts.join(', ')}.`;
}

export function formatSummary(summary, { period, status }) {
  const dollars = (summary.total_cents || 0) / 100;
  const total = dollars.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
  const statusText = status === 'all' ? '' : `${status} `;
  return `You have ${summary.count || 0} ${statusText}payments ${period === 'today' ? 'today' : 'in this ' + period}, totalling ${total}.`;
} 