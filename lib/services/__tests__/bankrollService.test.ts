import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBankroll,
  setBankroll,
  clearBankroll,
  getBankrollContext,
  getSizingContext,
} from '../bankrollService';
import { addTradeRecord, clearTradeHistory } from '../tradeHistoryService';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

describe('getBankroll / setBankroll / clearBankroll', () => {
  it('returns null when not set', () => {
    expect(getBankroll()).toBeNull();
  });

  it('stores and retrieves a bankroll', () => {
    setBankroll(1000);
    expect(getBankroll()).toBe(1000);
  });

  it('clears the bankroll', () => {
    setBankroll(1000);
    clearBankroll();
    expect(getBankroll()).toBeNull();
  });

  it('rejects zero or negative values', () => {
    setBankroll(0);
    expect(getBankroll()).toBeNull();
    setBankroll(-100);
    expect(getBankroll()).toBeNull();
  });
});

describe('getBankrollContext', () => {
  it('returns zero deployed with no trade history', () => {
    const ctx = getBankrollContext();
    expect(ctx.totalDeployed).toBe(0);
    expect(ctx.tradeCount).toBe(0);
    expect(ctx.winRate).toBeNull();
  });

  it('calculates total deployed from confirmed trades', () => {
    addTradeRecord({
      marketQuestion: 'Will BTC hit $100k?',
      marketId: 'm1',
      side: 'YES',
      shares: 100,
      pricePerShare: 44,
      totalCost: 44,
      mode: 'PAPER_TRADE',
      status: 'confirmed',
    });
    addTradeRecord({
      marketQuestion: 'Will ETH hit $5k?',
      marketId: 'm2',
      side: 'YES',
      shares: 50,
      pricePerShare: 60,
      totalCost: 30,
      mode: 'PAPER_TRADE',
      status: 'confirmed',
    });
    const ctx = getBankrollContext();
    expect(ctx.totalDeployed).toBe(74);
    expect(ctx.tradeCount).toBe(2);
  });

  it('excludes failed trades from deployed total', () => {
    addTradeRecord({
      marketQuestion: 'Q',
      marketId: 'm1',
      side: 'YES',
      shares: 100,
      pricePerShare: 44,
      totalCost: 44,
      mode: 'PAPER_TRADE',
      status: 'failed',
    });
    const ctx = getBankrollContext();
    expect(ctx.totalDeployed).toBe(0);
  });

  it('calculates win rate from resolved trades', () => {
    addTradeRecord({
      marketQuestion: 'Q1',
      marketId: 'm1',
      side: 'YES',
      shares: 100,
      pricePerShare: 44,
      totalCost: 44,
      mode: 'PAPER_TRADE',
      status: 'confirmed',
      resolvedPnl: 56, // win
    });
    addTradeRecord({
      marketQuestion: 'Q2',
      marketId: 'm2',
      side: 'YES',
      shares: 100,
      pricePerShare: 44,
      totalCost: 44,
      mode: 'PAPER_TRADE',
      status: 'confirmed',
      resolvedPnl: -44, // loss
    });
    const ctx = getBankrollContext();
    expect(ctx.winRate).toBe(0.5);
  });
});

describe('getSizingContext', () => {
  it('returns null pctOfBankroll when no bankroll set', () => {
    const ctx = getSizingContext(100);
    expect(ctx.pctOfBankroll).toBeNull();
    expect(ctx.warning).toBeNull();
  });

  it('warns when trade is >10% of bankroll', () => {
    setBankroll(1000);
    const ctx = getSizingContext(150); // 15%
    expect(ctx.pctOfBankroll).toBeCloseTo(15);
    expect(ctx.warning).not.toBeNull();
  });

  it('warns more strongly when trade is >20% of bankroll', () => {
    setBankroll(1000);
    const ctx = getSizingContext(250); // 25%
    expect(ctx.warning).toContain('25%');
  });

  it('no warning for small trades', () => {
    setBankroll(1000);
    const ctx = getSizingContext(50); // 5%
    expect(ctx.warning).toBeNull();
  });
});
