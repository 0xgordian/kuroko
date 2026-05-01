/**
 * Signal Engine — honest, data-grounded market signals for active traders.
 *
 * Replaces the old "edge engine" which fabricated "STRONG EDGE" labels.
 * Every signal here is derived from observable, verifiable data.
 *
 * Signal types:
 *   TIGHT_SPREAD   — bid/ask spread < 2%. Easy to enter and exit cleanly.
 *   HIGH_ACTIVITY  — top-quartile volume + 24h movement. Market is live.
 *   MOVING         — significant 24h probability shift (>5pp). Repricing event.
 *   LIQUID         — deep order book relative to market size. Low slippage.
 *   NEAR_RESOLUTION— market closes within 7 days. Time value is real.
 *   WIDE_SPREAD    — spread > 5%. Warning: execution cost is high.
 *   LOW_VOLUME     — volume < $10k. Warning: thin market, hard to exit.
 *
 * We never claim a side is "underpriced" — we have no independent probability
 * estimate to compare against. We surface conditions, not recommendations.
 */

import type { Market } from '@/types';
import type { OrderBook } from './clobService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalType =
  | 'TIGHT_SPREAD'
  | 'HIGH_ACTIVITY'
  | 'MOVING'
  | 'LIQUID'
  | 'NEAR_RESOLUTION'
  | 'WIDE_SPREAD'
  | 'LOW_VOLUME';

export type SignalSeverity = 'positive' | 'warning' | 'neutral';

export interface MarketSignal {
  type: SignalType;
  label: string;
  detail: string;
  severity: SignalSeverity;
}

export interface MarketAnalysis {
  market: Market;
  signals: MarketSignal[];
  /** Execution quality score 0-100. Based on spread + liquidity only. */
  executionScore: number;
  /** Activity score 0-100. Based on volume + movement. */
  activityScore: number;
  /** Spread in basis points (if order book available) */
  spreadBps: number | null;
  /** Estimated slippage for a $100 order in bps (if order book available) */
  slippageBps: number | null;
  /** Depth on best bid side in $ (if order book available) */
  bidDepth: number | null;
  /** Depth on best ask side in $ (if order book available) */
  askDepth: number | null;
  /** Days until market closes */
  daysToClose: number | null;
}

// ─── Signal generators ────────────────────────────────────────────────────────

function spreadSignal(spreadBps: number): MarketSignal | null {
  if (spreadBps < 200) {
    return {
      type: 'TIGHT_SPREAD',
      label: 'Tight Spread',
      detail: `${(spreadBps / 100).toFixed(1)}% spread — low execution cost`,
      severity: 'positive',
    };
  }
  if (spreadBps > 500) {
    return {
      type: 'WIDE_SPREAD',
      label: 'Wide Spread',
      detail: `${(spreadBps / 100).toFixed(1)}% spread — high execution cost, consider limit orders`,
      severity: 'warning',
    };
  }
  return null;
}

function activitySignal(market: Market): MarketSignal | null {
  const change = Math.abs(market.probabilityChange24h ?? 0);
  if (market.volume > 500_000 && change > 3) {
    return {
      type: 'HIGH_ACTIVITY',
      label: 'High Activity',
      detail: `$${(market.volume / 1_000).toFixed(0)}K volume · ${change.toFixed(1)}pp 24h move`,
      severity: 'positive',
    };
  }
  return null;
}

function movingSignal(market: Market): MarketSignal | null {
  const change = market.probabilityChange24h;
  if (change == null) return null;
  if (Math.abs(change) >= 5) {
    const dir = change > 0 ? '▲' : '▼';
    return {
      type: 'MOVING',
      label: 'Moving',
      detail: `${dir} ${Math.abs(change).toFixed(1)}pp in 24h — active repricing`,
      severity: 'neutral',
    };
  }
  return null;
}

function liquiditySignal(market: Market, bidDepth: number | null, askDepth: number | null): MarketSignal | null {
  const depth = (bidDepth ?? 0) + (askDepth ?? 0);
  if (depth > 50_000 || market.liquidity > 200_000) {
    const src = depth > 0 ? `$${(depth / 1_000).toFixed(0)}K book depth` : `$${(market.liquidity / 1_000).toFixed(0)}K liquidity`;
    return {
      type: 'LIQUID',
      label: 'Deep Liquidity',
      detail: `${src} — large orders can fill cleanly`,
      severity: 'positive',
    };
  }
  return null;
}

function resolutionSignal(market: Market): MarketSignal | null {
  const daysToClose = Math.ceil(
    (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysToClose > 0 && daysToClose <= 7) {
    return {
      type: 'NEAR_RESOLUTION',
      label: 'Resolves Soon',
      detail: `${daysToClose}d to close — time value is real`,
      severity: 'neutral',
    };
  }
  return null;
}

function lowVolumeSignal(market: Market): MarketSignal | null {
  if (market.volume < 10_000) {
    return {
      type: 'LOW_VOLUME',
      label: 'Low Volume',
      detail: `$${(market.volume / 1_000).toFixed(1)}K total — thin market, hard to exit`,
      severity: 'warning',
    };
  }
  return null;
}

// ─── Slippage estimate ────────────────────────────────────────────────────────

/**
 * Estimate slippage in bps for a given dollar order size against the order book.
 * Walks the book and calculates the volume-weighted average fill price vs best price.
 */
export function estimateSlippage(
  book: OrderBook,
  side: 'BUY' | 'SELL',
  dollarSize: number,
): number | null {
  const levels = side === 'BUY' ? book.asks : book.bids;
  if (!levels.length) return null;

  const bestPrice = side === 'BUY' ? book.best_ask : book.best_bid;
  if (bestPrice <= 0) return null;

  let remaining = dollarSize;
  let totalCost = 0;
  let totalShares = 0;

  for (const level of levels) {
    const price = parseFloat(level.price);
    const size = parseFloat(level.size);
    if (!Number.isFinite(price) || !Number.isFinite(size)) continue;

    const levelCost = price * size;
    const fill = Math.min(remaining, levelCost);
    const shares = fill / price;

    totalCost += fill;
    totalShares += shares;
    remaining -= fill;
    if (remaining <= 0) break;
  }

  if (totalShares === 0) return null;
  const avgFillPrice = totalCost / totalShares;
  const slippageBps = Math.round(Math.abs(avgFillPrice - bestPrice) / bestPrice * 10_000);
  return slippageBps;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyseMarket(
  market: Market,
  book: OrderBook | null,
): MarketAnalysis {
  const signals: MarketSignal[] = [];

  // Spread analysis (requires order book)
  let spreadBps: number | null = null;
  let slippageBps: number | null = null;
  let bidDepth: number | null = null;
  let askDepth: number | null = null;

  if (book && book.best_bid > 0 && book.best_ask > 0) {
    spreadBps = Math.round(book.spread / book.mid_price * 10_000);
    const spreadSig = spreadSignal(spreadBps);
    if (spreadSig) signals.push(spreadSig);

    // Depth: sum top 5 levels
    bidDepth = book.bids.slice(0, 5).reduce((sum, b) => {
      const p = parseFloat(b.price);
      const s = parseFloat(b.size);
      return sum + (Number.isFinite(p) && Number.isFinite(s) ? p * s : 0);
    }, 0);
    askDepth = book.asks.slice(0, 5).reduce((sum, a) => {
      const p = parseFloat(a.price);
      const s = parseFloat(a.size);
      return sum + (Number.isFinite(p) && Number.isFinite(s) ? p * s : 0);
    }, 0);

    slippageBps = estimateSlippage(book, 'BUY', 100);
  }

  // Activity signals (from market data only)
  const actSig = activitySignal(market);
  if (actSig) signals.push(actSig);

  const movSig = movingSignal(market);
  if (movSig) signals.push(movSig);

  const liqSig = liquiditySignal(market, bidDepth, askDepth);
  if (liqSig) signals.push(liqSig);

  const resSig = resolutionSignal(market);
  if (resSig) signals.push(resSig);

  const lowVolSig = lowVolumeSignal(market);
  if (lowVolSig) signals.push(lowVolSig);

  // Days to close
  const daysToClose = Math.ceil(
    (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  // Execution score: based on spread + liquidity (0-100)
  let executionScore = 50; // baseline
  if (spreadBps !== null) {
    if (spreadBps < 100) executionScore += 30;
    else if (spreadBps < 200) executionScore += 20;
    else if (spreadBps < 500) executionScore += 5;
    else executionScore -= 20;
  }
  if (market.liquidity > 200_000) executionScore += 20;
  else if (market.liquidity > 50_000) executionScore += 10;
  else if (market.liquidity < 10_000) executionScore -= 20;
  executionScore = Math.max(0, Math.min(100, executionScore));

  // Activity score: based on volume + movement (0-100)
  let activityScore = 0;
  if (market.volume > 1_000_000) activityScore += 40;
  else if (market.volume > 500_000) activityScore += 30;
  else if (market.volume > 100_000) activityScore += 15;
  else if (market.volume > 10_000) activityScore += 5;

  const change = Math.abs(market.probabilityChange24h ?? 0);
  if (change > 10) activityScore += 40;
  else if (change > 5) activityScore += 25;
  else if (change > 2) activityScore += 10;

  const change7d = Math.abs(market.probabilityChange7d ?? 0);
  if (change7d > 15) activityScore += 20;
  else if (change7d > 7) activityScore += 10;

  activityScore = Math.min(100, activityScore);

  return {
    market,
    signals,
    executionScore,
    activityScore,
    spreadBps,
    slippageBps,
    bidDepth,
    askDepth,
    daysToClose: daysToClose > 0 ? daysToClose : null,
  };
}

/**
 * Analyse a list of markets and sort by activity score.
 * Returns the top N most active/interesting markets with honest signals.
 */
export function analyseMarkets(
  markets: Market[],
  books: Map<string, OrderBook>,
  limit = 10,
): MarketAnalysis[] {
  return markets
    .map((m) => analyseMarket(m, books.get(m.clobTokenId ?? '') ?? null))
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, limit);
}
