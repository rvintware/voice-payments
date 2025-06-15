import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

// GET /api/transactions?limit=25&starting_after=cursorId
router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 50);
  const startingAfter = req.query.starting_after; // id string

  let rows;
  if (startingAfter) {
    // get created_at for starting id to use as cursor
    const cursorRow = db.prepare('SELECT created_at, id FROM payments WHERE id = ?').get(startingAfter);
    if (!cursorRow) return res.status(400).json({ error: 'invalid_cursor' });
    rows = db.prepare(`SELECT * FROM payments WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`).all(cursorRow.created_at, limit);
  } else {
    rows = db.prepare(`SELECT * FROM payments ORDER BY created_at DESC LIMIT ?`).all(limit);
  }

  const hasMore = rows.length === limit;
  const nextCursor = hasMore ? rows[rows.length - 1].id : null;

  res.json({
    transactions: rows,
    has_more: hasMore,
    next_starting_after: nextCursor
  });
});

export default router; 