/**
 * Trade History Service — localStorage-based trade log
 * Records every paper trade and live order attempt automatically.
 */

export type TradeRecord = {
  id: string;
  timestamp: string;
  marketQuestion: string;
  marketId: string;
  side: 'YES' | 'NO';
  shares: number;
  pricePerShare: number; // cents
  totalCost: number;
  mode: 'PAPER_TRADE' | 'SIGNING_REQUIRED' | 'EXECUTED';
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  /** Resolved P&L — set when the market closes and outcome is known */
  resolvedPnl?: number;
  /** ISO timestamp when outcome was resolved */
  resolvedAt?: string;
};

const STORAGE_KEY = 'kuroko_trade_history';
const MAX_RECORDS = 200;

function load(): TradeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TradeRecord[]) : [];
  } catch {
    return [];
  }
}

function save(records: TradeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // storage full — ignore
  }
}

export function getTradeHistory(): TradeRecord[] {
  return load().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function addTradeRecord(record: Omit<TradeRecord, 'id' | 'timestamp'>): TradeRecord {
  const full: TradeRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const existing = load();
  save([full, ...existing]);
  return full;
}

export function clearTradeHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportTradeHistoryCSV(records: TradeRecord[]): void {
  const header = 'Date,Market,Side,Shares,Price (¢),Total Cost ($),Mode,Status,Outcome P&L';
  const rows = records.map((r) =>
    [
      new Date(r.timestamp).toLocaleString(),
      `"${r.marketQuestion.replace(/"/g, '""')}"`,
      r.side,
      r.shares,
      r.pricePerShare,
      r.totalCost.toFixed(2),
      r.mode,
      r.status,
      r.resolvedPnl != null ? `${r.resolvedPnl >= 0 ? '+' : ''}$${r.resolvedPnl.toFixed(2)}` : '',
    ].join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kuroko-trades-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Check resolved markets and update paper trade outcomes.
 * Call this periodically (e.g. on portfolio page load).
 */
export async function checkTradeOutcomes(): Promise<void> {
  const records = load();
  const pending = records.filter(
    (r) => r.mode === 'PAPER_TRADE' && r.status === 'confirmed' && r.resolvedPnl === undefined
  );
  if (!pending.length) return;

  // Fetch resolved markets from Gamma API
  const marketIds = [...new Set(pending.map((r) => r.marketId))];

  await Promise.allSettled(
    marketIds.map(async (marketId) => {
      try {
        // Use our own proxy to avoid CORS issues in production
        const res = await fetch(
          `/api/markets/${encodeURIComponent(marketId)}`,
          { cache: 'no-store', headers: { Accept: 'application/json' } }
        );
        if (!res.ok) return;
        const market = await res.json() as Record<string, unknown>;

        // Check if market is resolved
        if (!market.closed && !market.resolved) return;

        // Determine winning outcome
        const outcomes = typeof market.outcomes === 'string'
          ? JSON.parse(market.outcomes) as string[]
          : (market.outcomes as string[] ?? []);
        const outcomePrices = typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices) as string[]
          : (market.outcomePrices as string[] ?? []);

        const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
        const yesPrice = yesIdx >= 0 ? parseFloat(String(outcomePrices[yesIdx] ?? '0')) : 0;

        // YES resolved = price ~1.0, NO resolved = price ~0.0
        const yesWon = yesPrice > 0.9;
        const noWon = yesPrice < 0.1;

        // Update all pending trades for this market
        const updated = load().map((r) => {
          if (r.marketId !== marketId || r.resolvedPnl !== undefined) return r;
          if (!yesWon && !noWon) return r; // not yet resolved cleanly

          const won = (r.side === 'YES' && yesWon) || (r.side === 'NO' && noWon);
          const resolvedPnl = won ? r.shares - r.totalCost : -r.totalCost;
          return { ...r, resolvedPnl, resolvedAt: new Date().toISOString() };
        });
        save(updated);
      } catch {
        // Silent fail per market
      }
    })
  );
}
