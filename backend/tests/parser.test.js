import { describe, it, expect } from 'vitest';
import { extractAmountCents, wordsToNumber } from '../src/utils/parser.js';

describe('parser utils', () => {
  it('converts number words to integer', () => {
    expect(wordsToNumber('twenty')).toBe(20);
    expect(wordsToNumber('thirty five')).toBe(35);
    expect(wordsToNumber('one hundred')).toBe(100);
  });

  it('extracts numeric amounts', () => {
    expect(extractAmountCents('send 15 dollars')).toBe(1500);
    expect(extractAmountCents('Pay $2.50 to John')).toBe(250);
  });

  it('extracts word amounts', () => {
    expect(extractAmountCents('send twenty dollars')).toBe(2000);
  });
}); 