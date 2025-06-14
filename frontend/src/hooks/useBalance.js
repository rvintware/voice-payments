import { useEffect, useState } from 'react';

export default function useBalance() {
  const [availableCents, setAvail] = useState(null);
  const [pendingCents, setPend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchBal() {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/balance');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAvail(data.availableCents);
      setPend(data.pendingCents);
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

  return { availableCents, pendingCents, loading, error };
} 