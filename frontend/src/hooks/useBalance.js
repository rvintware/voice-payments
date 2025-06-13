import { useEffect, useState } from 'react';

export default function useBalance() {
  const [bal, setBal] = useState({ available: null, pending: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchBal() {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/balance');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setBal({ available: data.availableCents, pending: data.pendingCents });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBal();
    const id = setInterval(fetchBal, 30000);
    return () => clearInterval(id);
  }, []);

  return { ...bal, loading, error };
} 