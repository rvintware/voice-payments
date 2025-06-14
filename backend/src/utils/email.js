export function normalizeRecipient(input) {
  if (!input) return null;
  const lower = input.trim().toLowerCase();
  const emailRegex = /\S+@\S+\.\w+/;
  if (emailRegex.test(lower)) return lower;
  // strip non-letters, spaces
  const nameSlug = lower.replace(/[^a-z0-9]/g, '');
  if (!nameSlug) return null;
  return `${nameSlug}@gmail.com`;
} 