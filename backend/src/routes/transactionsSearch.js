import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

function buildWhere(filters, params) {
  const where = [];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.min_amount_cents != null) {
    where.push('amount >= ?');
    params.push(filters.min_amount_cents);
  }
  if (filters.max_amount_cents != null) {
    where.push('amount <= ?');
    params.push(filters.max_amount_cents);
  }
  if (filters.currency) {
    where.push('currency = ?');
    params.push(filters.currency.toLowerCase());
  }
  if (filters.from_date) {
    where.push('date(created_at) >= date(?)');
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    where.push('date(created_at) <= date(?)');
    params.push(filters.to_date);
  }
  return where;
}

router.post('/transactions/search', (req, res) => {
  try {
    const filters = req.body || {};
    let limit = Number(filters.limit) || 10;
    limit = Math.min(Math.max(limit, 1), 50);

    const params = [];
    const where = buildWhere(filters, params);
    const sql = `SELECT * FROM payments ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`;
    const rows = db.prepare(sql).all(...params, limit);

    res.json(rows);
  } catch (err) {
    console.error('Search transactions error', err);
    res.status(500).json({ error: 'search_failed' });
  }
});

export default router; 