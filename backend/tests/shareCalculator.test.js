import { describe, it, expect } from 'vitest';
import { equalSplit } from '../src/utils/shareCalculator.js';

describe('equalSplit', () => {
  it('splits evenly with no remainder', () => {
    expect(equalSplit(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it('distributes remainder cents to last participants', () => {
    // 100 cents split by 3 -> [33,33,34]
    expect(equalSplit(100, 3)).toEqual([33, 33, 34]);
  });

  it('throws on invalid input', () => {
    expect(() => equalSplit(-100, 3)).toThrow();
    expect(() => equalSplit(100, 0)).toThrow();
  });
}); 