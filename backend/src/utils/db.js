import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

let db;

if (process.env.NODE_ENV === 'test') {
  // Lightweight in-memory stub so vitest can run without native deps
  const stubStmt = { run: () => {}, get: () => undefined, all: () => [] };
  db = { prepare: () => stubStmt };
} else {
  // Dynamically require better-sqlite3 only in non-test env to avoid Vitest bundling issues
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line global-require
  const Database = require('better-sqlite3');

  // Determine database file path: env var or default to project root /backend/data/stripe.db
  const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'backend', 'data', 'stripe.db');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);

  const migrations = [
    `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT,
        card_brand TEXT,
        last4 TEXT,
        customer_email TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
     );`,
    'CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at);',
    'CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);'
  ];
  migrations.forEach((sql) => db.prepare(sql).run());

  // Older databases created before the customer_email column existed need a quick one-time migration.
  try {
    db.prepare('ALTER TABLE payments ADD COLUMN customer_email TEXT').run();
  } catch (err) {
    // Will fail with "duplicate column" once the column exists – that is expected.
  }
}

export default db; 