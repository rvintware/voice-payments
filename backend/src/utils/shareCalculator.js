export function equalSplit(totalCents, n) {
  totalCents = Math.round(Number(totalCents));
  if (!Number.isInteger(totalCents) || totalCents <= 0) throw new Error('totalCents must be positive integer');
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be positive integer');
  const base = Math.floor(totalCents / n);
  let remainder = totalCents - base * n;
  const shares = Array.from({ length: n }, () => base);
  // give remainder cents to last people in array
  for (let i = shares.length - 1; remainder > 0; i -= 1, remainder -= 1) {
    shares[i] += 1;
  }
  return shares; // length n, sums to totalCents
} 