import { format } from 'date-fns';
import moneyToWords from './moneyWords.js';

export function balanceSentence({ type, cents }) {
  return `Your ${type} balance is ${moneyToWords(cents)}.`;
}

function fmtDate(iso) {
  return format(new Date(iso), 'MMM d');
}

export function listSentence(rows) {
  if (!rows.length) return 'You have no recent transactions.';
  const parts = rows.map((t) => `${moneyToWords(t.amount)} on ${fmtDate(t.created_at)}`);
  return `Here are the latest ${rows.length} transactions: ${parts.join(', ')}.`;
} 