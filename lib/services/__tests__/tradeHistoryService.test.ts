import { describe, it, expect, beforeEach } from 'vitest';
import {
  addTradeRecord,
  getTradeHistory,
  clearTradeHistory,
} from '../tradeHistoryService';

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

const baseRecord = {
  marketQuestion: 'Will BTC hit $100k?',
  marketId: 'market-btc',
  side: 'YES' as const,
  shares: 100,
  pricePerShare: 44,
  totalCost: 44,
  mode: 'PAPER_TRADE' as const,
  status: 'confirmed' as const,
};

beforeEach(() => {
  localStorageMock.clear();
});

describe('addTradeRecord', () => {
  it('adds a record with auto-generated id and timestamp', () => {
    const record = addTradeRecord(baseRecord);
    expect(record.id).toBeDefined();
    expect(record.timestamp).toBeDefined();
    expect(new Date(record.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('stores the record in history', () => {
    addTradeRecord(baseRecord);
    const history = getTradeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].marketQuestion).toBe('Will BTC hit $100k?');
  });

  it('returns records sorted newest first', () => {
    addTradeRecord({ ...baseRecord, marketQuestion: 'First' });
    addTradeRecord({ ...baseRecord, marketQuestion: 'Second' });
    const history = getTradeHistory();
    expect(history[0].marketQuestion).toBe('Second');
    expect(history[1].marketQuestion).toBe('First');
  });

  it('stores all required fields', () => {
    const record = addTradeRecord(baseRecord);
    expect(record.side).toBe('YES');
    expect(record.shares).toBe(100);
    expect(record.pricePerShare).toBe(44);
    expect(record.totalCost).toBe(44);
    expect(record.mode).toBe('PAPER_TRADE');
    expect(record.status).toBe('confirmed');
  });
});

describe('getTradeHistory', () => {
  it('returns empty array when no history', () => {
    expect(getTradeHistory()).toHaveLength(0);
  });

  it('returns all records', () => {
    addTradeRecord(baseRecord);
    addTradeRecord({ ...baseRecord, marketQuestion: 'Another market' });
    expect(getTradeHistory()).toHaveLength(2);
  });
});

describe('clearTradeHistory', () => {
  it('removes all records', () => {
    addTradeRecord(baseRecord);
    clearTradeHistory();
    expect(getTradeHistory()).toHaveLength(0);
  });
});

describe('record integrity', () => {
  it('each record has a unique id', () => {
    const r1 = addTradeRecord(baseRecord);
    const r2 = addTradeRecord(baseRecord);
    expect(r1.id).not.toBe(r2.id);
  });

  it('preserves optional txHash field', () => {
    const record = addTradeRecord({ ...baseRecord, txHash: '0xabc123' });
    expect(record.txHash).toBe('0xabc123');
  });

  it('preserves resolvedPnl when provided', () => {
    const record = addTradeRecord({ ...baseRecord, resolvedPnl: 56 });
    const history = getTradeHistory();
    expect(history[0].resolvedPnl).toBe(56);
  });
});
