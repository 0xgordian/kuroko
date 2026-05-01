import { describe, it, expect } from 'vitest';
import { findEdges } from '../edgeEngine';
import type { Market } from '@/types';

const mockMarkets: Market[] = [
  {
    id: 'test-1',
    question: 'Will Bitcoin reach $100k?',
    currentProbability: 52,
    volume: 1500000,
    liquidity: 90000,
    endDate: '2024-12-31T00:00:00Z',
    active: true,
    probabilityChange24h: 4.2,
  },
  {
    id: 'test-2',
    question: 'Will the Fed cut rates?',
    currentProbability: 38,
    volume: 800000,
    liquidity: 55000,
    endDate: '2024-06-30T00:00:00Z',
    active: true,
    probabilityChange24h: -3.1,
  },
  {
    id: 'test-3',
    question: 'Will ETH ETF inflows stay positive?',
    currentProbability: 61,
    volume: 600000,
    liquidity: 40000,
    endDate: '2024-03-31T00:00:00Z',
    active: true,
    probabilityChange24h: null,
  },
];

describe('edgeEngine', () => {
  it('returns up to 3 opportunities', () => {
    const result = findEdges(mockMarkets, 'show all markets');
    expect(result.opportunities.length).toBeLessThanOrEqual(3);
    expect(result.opportunities.length).toBeGreaterThan(0);
  });

  it('ranks by edge score descending', () => {
    const result = findEdges(mockMarkets, 'show all markets');
    const scores = result.opportunities.map((o) => o.edgeScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('produces deterministic results for same input', () => {
    const r1 = findEdges(mockMarkets, 'bitcoin');
    const r2 = findEdges(mockMarkets, 'bitcoin');
    expect(r1.opportunities.map((o) => o.market.id)).toEqual(
      r2.opportunities.map((o) => o.market.id)
    );
    expect(r1.opportunities.map((o) => o.edgeScore)).toEqual(
      r2.opportunities.map((o) => o.edgeScore)
    );
  });

  it('handles null probabilityChange24h gracefully', () => {
    const result = findEdges(mockMarkets, 'eth');
    expect(result.opportunities.length).toBeGreaterThan(0);
    // Should not throw even when change is null
  });

  it('filters by keyword when matches exist', () => {
    const result = findEdges(mockMarkets, 'fed rates');
    // Should find the Fed rates market
    expect(result.opportunities.some((o) =>
      o.market.question.toLowerCase().includes('fed')
    )).toBe(true);
  });

  it('includes required fields in each opportunity', () => {
    const result = findEdges(mockMarkets, 'show all markets');
    for (const opp of result.opportunities) {
      expect(opp).toHaveProperty('market');
      expect(opp).toHaveProperty('edgeScore');
      expect(opp).toHaveProperty('edgeStrength');
      expect(opp).toHaveProperty('side');
      expect(opp).toHaveProperty('reasoning');
      expect(opp).toHaveProperty('suggestedShares');
      expect(opp).toHaveProperty('referencePrice');
      expect(['STRONG', 'MODERATE', 'WEAK']).toContain(opp.edgeStrength);
      expect(['YES', 'NO']).toContain(opp.side);
    }
  });
});
