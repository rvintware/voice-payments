import { useEffect, useRef } from 'react';
import { useTransactionsContext } from '../context/TransactionsContext.jsx';
import { format } from 'date-fns';

const statusClasses = {
  succeeded: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  requires_payment_method: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700'
};

function Amount({ cents, currency }) {
  const value = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase()
  });
  return <span className="text-base font-medium">{value}</span>;
}

export default function TransactionsFeed() {
  const { transactions, fetchMore, hasMore } = useTransactionsContext();
  const sentinel = useRef(null);

  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchMore();
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [fetchMore, hasMore]);

  return (
    <div className="card bg-white rounded-xl shadow p-6 max-w-xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
      <ul className="relative border-l-2 border-gray-100">
        {transactions.map(tx => (
          <li key={tx.id} className="pl-4 mb-6 animate-slide-up-fade">
            <span className="absolute -left-1.5 top-2 h-3 w-3 rounded-full bg-blue-500" />
            <div className="flex justify-between items-center gap-4">
              <Amount cents={tx.amount} currency={tx.currency} />
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClasses[tx.status] || 'bg-gray-200 text-gray-700'}`}>
                {tx.status.replaceAll('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {format(new Date(tx.created_at), 'MMM d, h:mm a')} • {tx.card_brand?.toUpperCase()} •••• {tx.last4}
            </p>
            {tx.description && <p className="text-sm mt-1">{tx.description}</p>}
          </li>
        ))}
        {hasMore && <li ref={sentinel} />}
      </ul>
    </div>
  );
} 