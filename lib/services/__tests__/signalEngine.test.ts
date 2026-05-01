import { describe, it, expect } from 'vitest';
import { analyseMarket, estimateSlippage } from '../signalEngine';
import type { Market } from '@/types';
import type { OrderBook } from '../clobService';

const baseMarket: Market = {
  id: 'test-market',
  question: 'Will BTC hit $100k by end of 2026?',
  currentProbability: 44,
  volume: 1_200_000,
  liquidity: 300_000,
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  active: true,
  probabilityChange24h: 6.5,
  probabilityChange7d: 12,
  probabilityChange30d: null,
};

const tightBook: OrderBook = {
  market: 'test',
  asset_id: 'tok1',
  bids: [
    { price: '0.435', size: '5000' },
    { price: '0.430', size: '3000' },
  ],
  asks: [
    { price: '0.440', size: '5000' },
    { price: '0.445', size: '3000' },
  ],
  best_bid: 0.435,
  best_ask: 0.440,
  spread: 0.005,   // 5 / 437.5 = ~114 bps — triggers TIGHT_SPREAD
  mid_price: 0.4375,
};

const wideBook: OrderBook = {
  ...tightBook,
  best_bid: 0.35,
  best_ask: 0.55,
  spread: 0.20,
  mid_price: 0.45,
  bids: [{ price: '0.35', size: '100' }],
  asks: [{ price: '0.55', size: '100' }],
};

describe('analyseMarket', () => {
  it('returns all required fields', () => {
    const result = analyseMarket(baseMarket, tightBook);
    expect(result).toHaveProperty('market');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('executionScore');
    expect(result).toHaveProperty('activityScore');
    expect(result).toHaveProperty('spreadBps');
    expect(result).toHaveProperty('slippageBps');
    expect(result).toHaveProperty('daysToClose');
  });

  it('produces TIGHT_SPREAD signal for narrow spread', () => {
    const result = analyseMarket(baseMarket, tightBook);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('TIGHT_SPREAD');
    expect(types).not.toContain('WIDE_SPREAD');
  });

  it('produces WIDE_SPREAD signal for wide spread', () => {
    const result = analyseMarket(baseMarket, wideBook);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('WIDE_SPREAD');
    expect(types).not.toContain('TIGHT_SPREAD');
  });

  it('produces HIGH_ACTIVITY signal for high volume + movement', () => {
    const result = analyseMarket(baseMarket, tightBook);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('HIGH_ACTIVITY');
  });

  it('produces MOVING signal for 24h change >= 5pp', () => {
    const result = analyseMarket(baseMarket, null);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('MOVING');
  });

  it('does not produce MOVING signal for small 24h change', () => {
    const m = { ...baseMarket, probabilityChange24h: 1.5 };
    const result = analyseMarket(m, null);
    const types = result.signals.map((s) => s.type);
    expect(types).not.toContain('MOVING');
  });

  it('produces LOW_VOLUME signal for thin markets', () => {
    const m = { ...baseMarket, volume: 5_000 };
    const result = analyseMarket(m, null);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('LOW_VOLUME');
  });

  it('produces NEAR_RESOLUTION signal for markets closing within 7 days', () => {
    const m = { ...baseMarket, endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() };
    const result = analyseMarket(m, null);
    const types = result.signals.map((s) => s.type);
    expect(types).toContain('NEAR_RESOLUTION');
  });

  it('execution score is between 0 and 100', () => {
    const result = analyseMarket(baseMarket, tightBook);
    expect(result.executionScore).toBeGreaterThanOrEqual(0);
    expect(result.executionScore).toBeLessThanOrEqual(100);
  });

  it('activity score is between 0 and 100', () => {
    const result = analyseMarket(baseMarket, tightBook);
    expect(result.activityScore).toBeGreaterThanOrEqual(0);
    expect(result.activityScore).toBeLessThanOrEqual(100);
  });

  it('handles null order book gracefully', () => {
    const result = analyseMarket(baseMarket, null);
    expect(result.spreadBps).toBeNull();
    expect(result.slippageBps).toBeNull();
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const r1 = analyseMarket(baseMarket, tightBook);
    const r2 = analyseMarket(baseMarket, tightBook);
    expect(r1.executionScore).toBe(r2.executionScore);
    expect(r1.activityScore).toBe(r2.activityScore);
    expect(r1.signals.map((s) => s.type)).toEqual(r2.signals.map((s) => s.type));
  });
});

describe('estimateSlippage', () => {
  it('returns slippage in bps for a BUY order', () => {
    const slippage = estimateSlippage(tightBook, 'BUY', 100);
    expect(slippage).not.toBeNull();
    expect(slippage).toBeGreaterThanOrEqual(0);
  });

  it('returns null when no ask levels', () => {
    const emptyBook: OrderBook = { ...tightBook, asks: [], best_ask: 0 };
    const slippage = estimateSlippage(emptyBook, 'BUY', 100);
    expect(slippage).toBeNull();
  });

  it('returns 0 bps for a tiny order that fills at best price', () => {
    // $1 order into a $5000 level at 0.44 — should fill entirely at best ask
    const slippage = estimateSlippage(tightBook, 'BUY', 1);
    expect(slippage).toBe(0);
  });
});
