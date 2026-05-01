/**
 * Core data models for Kuroko
 */

/** A single active Polymarket prediction market */
export interface Market {
  id: string;
  question: string;
  currentProbability: number; // 0-100
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  slug?: string;
  /** 24h probability change (positive = moved up). Null if real data unavailable. */
  probabilityChange24h?: number | null;
  /** 7d probability change in percentage points. Null if unavailable. */
  probabilityChange7d?: number | null;
  /** 30d probability change in percentage points. Null if unavailable. */
  probabilityChange30d?: number | null;
  /** CLOB YES token ID for order book and live trading */
  clobTokenId?: string;
}

/** Edge opportunity detected by the AI analysis engine */
export interface EdgeOpportunity {
  market: Market;
  /** Edge score 0-100 — higher = stronger opportunity */
  edgeScore: number;
  /** STRONG | MODERATE | WEAK */
  edgeStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  /** YES or NO — which side has the edge */
  side: 'YES' | 'NO';
  /** Plain-English reason why this market is interesting */
  reasoning: string;
  /** Short breakdown of what drove the score e.g. "vol $2.3M · near 50% · +4.1pp 24h" */
  scoreBreakdown: string;
  /** Suggested bet size in shares */
  suggestedShares: number;
  /** Reference price in cents */
  referencePrice: number;
  /** Estimated return if correct */
  estimatedReturn: number;
}

export type ExecutionMode = 'PAPER_TRADE' | 'SIGNING_REQUIRED' | 'EXECUTED';

/** Bet proposal ready for simulation/execution */
export interface BetProposal {
  market: Market;
  side: 'YES' | 'NO';
  shares: number;
  pricePerShare: number;
  totalCost: number;
  estimatedPayout: number;
  estimatedReturn: number;
  tradeIntent: string;
  backendResponse?: string;
  mode: ExecutionMode;
  slippageBps?: number | null;
}

/** Response from trade intent submission */
export interface TradeIntentResponse {
  success: boolean;
  message: string;
  mode: ExecutionMode;
  txHash?: string;
  orderId?: string;
}

/** Query result from the edge finder */
export interface EdgeQueryResult {
  query: string;
  opportunities: EdgeOpportunity[];
  summary: string;
  timestamp: string;
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface LiveOrderBook {
  tokenId: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  best_bid: number;
  best_ask: number;
  spread: number;
  mid_price: number;
  timestamp: string;
}

export interface UserPosition {
  market_id: string;
  question: string;
  outcome: 'YES' | 'NO';
  size: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
}
