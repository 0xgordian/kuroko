import { describe, expect, it } from 'vitest';
import {
  derive24hPriceChangeFromHistory,
  getYesTokenId,
  parseStringArray,
} from '../polymarketData';

describe('polymarketData helpers', () => {
  it('parses JSON string arrays safely', () => {
    expect(parseStringArray('["Yes","No"]')).toEqual(['Yes', 'No']);
    expect(parseStringArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(parseStringArray('')).toEqual([]);
  });

  it('prefers the Yes token when present', () => {
    expect(
      getYesTokenId({
        clobTokenIds: '["yes-token","no-token"]',
        outcomes: '["Yes","No"]',
      }),
    ).toBe('yes-token');
  });

  it('derives a 24h change from CLOB history points', () => {
    expect(
      derive24hPriceChangeFromHistory([
        { t: 100, p: 0.41 },
        { t: 200, p: 0.46 },
      ]),
    ).toBe(0.05);
  });

  it('returns null when history is too sparse', () => {
    expect(derive24hPriceChangeFromHistory([{ t: 100, p: 0.41 }])).toBeNull();
  });
});
