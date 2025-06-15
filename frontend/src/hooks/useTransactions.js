import { useState, useCallback, useEffect } from 'react';

export default function useTransactions(pageLimit = 25) {
  const [transactions, setTransactions] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams({ limit: pageLimit });
    if (cursor) params.append('starting_after', cursor);

    try {
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const json = await res.json();
      setTransactions(t => [...t, ...json.transactions]);
      setCursor(json.next_starting_after);
      setHasMore(json.has_more);
    } catch (err) {
      /* eslint-disable no-console */
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, pageLimit]);

  // initial load
  useEffect(() => {
    fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { transactions, fetchMore, hasMore, loading };
} 