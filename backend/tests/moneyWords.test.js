import { describe, it, expect } from 'vitest';
import moneyToWords from '../src/utils/moneyWords.js';

describe('moneyToWords – zero handling', () => {
  it('returns zero dollars for 0 cents', () => {
    expect(moneyToWords(0)).toBe('zero dollars canadian dollars');
  });

  it('returns zero dollars for -0 cents (JS quirk)', () => {
    expect(moneyToWords(-0)).toBe('zero dollars canadian dollars');
  });
}); 