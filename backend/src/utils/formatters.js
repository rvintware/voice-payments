import moneyToWords from './moneyWords.js';

export function formatList(rows) {
  if (!rows.length) return 'No matching transactions found.';
  const parts = rows.map((tx) => {
    const amountWords = moneyToWords(tx.amount);
    const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric'
    });
    return `${amountWords} on ${dateStr}`;
  });
  return `Here are the latest ${rows.length} transactions: ${parts.join(', ')}.`;
}

export function formatSummary(summary, { period, status }) {
  const total = moneyToWords(summary.total_cents || 0);
  const statusText = status === 'all' ? '' : `${status} `;
  return `You have ${summary.count || 0} ${statusText}payments ${period === 'today' ? 'today' : 'in this ' + period}, totalling ${total}.`;
} 