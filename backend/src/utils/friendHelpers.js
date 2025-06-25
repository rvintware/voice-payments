import { normalizeRecipient } from './email.js';

export function normalizeFriends(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  // Handle string or object entries and ensure { name, email }
  return raw.map((f) => {
    if (typeof f === 'string') {
      const name = f.trim();
      return { name, email: normalizeRecipient(name) };
    }
    const name = (f?.name || f?.email || 'Friend').trim();
    return { name, email: f?.email || normalizeRecipient(name) };
  });
} 