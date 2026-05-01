import { describe, it, expect, beforeEach } from 'vitest';
import {
  addGuard,
  getGuards,
  removeGuard,
  toggleGuard,
  analyseGuard,
  checkGuards,
  calculateDefaultThresholds,
  validateGuardThresholds,
  type PositionGuard,
} from '../positionGuardService';

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

const baseGuard: Omit<PositionGuard, 'id' | 'createdAt' | 'active'> = {
  marketId: 'market-1',
  marketQuestion: 'Will BTC hit $100k?',
  clobTokenId: 'tok-1',
  shares: 100,
  entryPrice: 44,
  takeProfit: 60,
  stopLoss: 30,
};

beforeEach(() => {
  localStorageMock.clear();
});

describe('calculateDefaultThresholds', () => {
  it('sets take-profit 10pp above current probability', () => {
    const { takeProfit } = calculateDefaultThresholds(50);
    expect(takeProfit).toBe(60);
  });

  it('sets stop-loss 10pp below current probability', () => {
    const { stopLoss } = calculateDefaultThresholds(50);
    expect(stopLoss).toBe(40);
  });

  it('caps take-profit at 99', () => {
    const { takeProfit } = calculateDefaultThresholds(95);
    expect(takeProfit).toBe(99);
  });

  it('floors stop-loss at 1', () => {
    const { stopLoss } = calculateDefaultThresholds(5);
    expect(stopLoss).toBe(1);
  });
});

describe('validateGuardThresholds', () => {
  it('accepts valid thresholds', () => {
    expect(validateGuardThresholds(30, 70).valid).toBe(true);
  });

  it('rejects stop-loss >= take-profit', () => {
    expect(validateGuardThresholds(60, 60).valid).toBe(false);
    expect(validateGuardThresholds(70, 60).valid).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(validateGuardThresholds(0, 60).valid).toBe(false);
    expect(validateGuardThresholds(30, 100).valid).toBe(false);
  });
});

describe('addGuard / getGuards / removeGuard', () => {
  it('adds and retrieves a guard', () => {
    addGuard(baseGuard);
    const guards = getGuards();
    expect(guards).toHaveLength(1);
    expect(guards[0].marketQuestion).toBe('Will BTC hit $100k?');
    expect(guards[0].active).toBe(true);
  });

  it('removes a guard by id', () => {
    const g = addGuard(baseGuard);
    removeGuard(g.id);
    expect(getGuards()).toHaveLength(0);
  });

  it('toggles active state', () => {
    const g = addGuard(baseGuard);
    expect(g.active).toBe(true);
    toggleGuard(g.id);
    expect(getGuards()[0].active).toBe(false);
    toggleGuard(g.id);
    expect(getGuards()[0].active).toBe(true);
  });
});

describe('analyseGuard', () => {
  it('returns HOLD when probability is within range', () => {
    const g = addGuard(baseGuard);
    const analysis = analyseGuard(g, 50);
    expect(analysis.action).toBe('HOLD');
    expect(analysis.shareCount).toBe(0);
  });

  it('returns SELL when probability reaches take-profit', () => {
    const g = addGuard(baseGuard);
    const analysis = analyseGuard(g, 60);
    expect(analysis.action).toBe('SELL');
    expect(analysis.shareCount).toBe(40); // 40% of 100 shares
  });

  it('returns REDUCE when probability hits stop-loss', () => {
    const g = addGuard(baseGuard);
    const analysis = analyseGuard(g, 30);
    expect(analysis.action).toBe('REDUCE');
    expect(analysis.shareCount).toBe(65); // 65% of 100 shares
  });

  it('includes a trade intent string', () => {
    const g = addGuard(baseGuard);
    const analysis = analyseGuard(g, 65);
    expect(analysis.tradeIntent).toContain('YES shares');
    expect(analysis.tradeIntent).toContain('Will BTC hit $100k?');
  });

  it('includes all condition checks', () => {
    const g = addGuard(baseGuard);
    const analysis = analyseGuard(g, 50);
    expect(analysis.conditions.length).toBeGreaterThan(0);
    expect(analysis.conditions.every((c) => 'label' in c && 'passed' in c)).toBe(true);
  });
});

describe('checkGuards', () => {
  it('returns triggered guards and deactivates them', () => {
    addGuard(baseGuard);
    const triggered = checkGuards({ 'market-1': 65 }); // above take-profit
    expect(triggered).toHaveLength(1);
    expect(triggered[0].action).toBe('SELL');
  });

  it('returns empty array when no guards trigger', () => {
    addGuard(baseGuard);
    const triggered = checkGuards({ 'market-1': 50 }); // within range
    expect(triggered).toHaveLength(0);
  });

  it('skips inactive guards', () => {
    const g = addGuard(baseGuard);
    toggleGuard(g.id); // deactivate
    const triggered = checkGuards({ 'market-1': 65 });
    expect(triggered).toHaveLength(0);
  });

  it('skips guards with no matching market probability', () => {
    addGuard(baseGuard);
    const triggered = checkGuards({ 'other-market': 65 });
    expect(triggered).toHaveLength(0);
  });

  it('updates lastCheckedAt on every check', () => {
    addGuard(baseGuard);
    checkGuards({ 'market-1': 50 });
    const guards = getGuards();
    expect(guards[0].lastCheckedAt).toBeDefined();
  });
});
