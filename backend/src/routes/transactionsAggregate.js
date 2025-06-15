import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      return d;
    }
    case 'yesterday': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
      return d;
    }
    case 'week': {
      const dayOfWeek = now.getUTCDay(); // 0 (Sun) - 6 (Sat)
      const diff = (dayOfWeek + 6) % 7; // days since Monday
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
      return d;
    }
    case 'month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case 'year':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    default:
      return null;
  }
}

router.get('/transactions/aggregate', (req, res) => {
  try {
    const { period = 'today', status = 'succeeded', currency } = req.query;
    const params = [];
    const where = [];

    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }

    if (currency) {
      where.push('currency = ?');
      params.push(currency.toLowerCase());
    }

    const startDate = getStartDate(period);
    if (startDate) {
      where.push('datetime(created_at) >= datetime(?)');
      params.push(new Date(startDate).toISOString());
    }

    const sql = `SELECT COUNT(*) as count, SUM(amount) as total_cents, AVG(amount) as avg_cents, MAX(amount) as max_cents FROM payments ${
      where.length ? 'WHERE ' + where.join(' AND ') : ''
    }`;

    const row = db.prepare(sql).get(...params);
    res.json({ ...row, period, status, currency: currency?.toLowerCase() });
  } catch (err) {
    console.error('Aggregate transactions error', err);
    res.status(500).json({ error: 'aggregate_failed' });
  }
});

export default router; 