import toWordsPkg from 'number-to-words';
const { toWords } = toWordsPkg;

/**
 * Convert integer cents to spoken English words.
 * Examples:
 *   101454 → "one thousand and fourteen dollars and fifty four cents Canadian dollars"
 *   10000  → "one hundred dollars Canadian dollars"
 *   99     → "ninety nine cents Canadian dollars"
 *
 * @param {number} cents Whole number of cents (can be negative)
 * @param {string} currencyName e.g. "Canadian"
 * @returns {string}
 */
export default function moneyToWords(cents, currencyName = 'Canadian') {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const centsPart = abs % 100;

  const wordify = (n) => toWords(n).replace(/-/g, ' ');

  let parts = [];
  if (dollars) {
    parts.push(`${wordify(dollars)} dollar${dollars === 1 ? '' : 's'}`);
  }
  if (centsPart) {
    parts.push(`${wordify(centsPart)} cent${centsPart === 1 ? '' : 's'}`);
  }

  const phrase = parts.join(' and ');
  const sign = cents < 0 ? 'minus ' : '';
  return `${sign}${phrase} ${currencyName.toLowerCase()} dollars`.trim();
} 