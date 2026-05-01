const CLOB_PROXY = '/api/clob';

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  best_bid: number;
  best_ask: number;
  spread: number;
  mid_price: number;
}

export interface ClobMarketPrice {
  tokenId: string;
  price: number;
  probability: number;
}

export interface UserPosition {
  market_id: string;
  question: string;
  outcome: string;
  size: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
}

export async function fetchOrderBook(tokenId: string): Promise<OrderBook | null> {
  try {
    const res = await fetch(`${CLOB_PROXY}/book?token_id=${encodeURIComponent(tokenId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = await res.json();

    const bids: Array<{ price: string; size: string }> = Array.isArray(data.bids) ? data.bids : [];
    const asks: Array<{ price: string; size: string }> = Array.isArray(data.asks) ? data.asks : [];

    const bidPrices = bids.map((b) => parseFloat(b.price)).filter(Number.isFinite);
    const askPrices = asks.map((a) => parseFloat(a.price)).filter(Number.isFinite);

    const best_bid = bidPrices.length > 0 ? Math.max(...bidPrices) : 0;
    const best_ask = askPrices.length > 0 ? Math.min(...askPrices) : 0;
    const spread = best_ask - best_bid;
    const mid_price = best_bid > 0 && best_ask > 0 ? (best_bid + best_ask) / 2 : 0;

    return {
      market: data.market ?? '',
      asset_id: data.asset_id ?? tokenId,
      bids,
      asks,
      best_bid,
      best_ask,
      spread,
      mid_price,
    };
  } catch {
    return null;
  }
}

export async function fetchTokenPrice(tokenId: string): Promise<ClobMarketPrice | null> {
  try {
    const res = await fetch(`${CLOB_PROXY}/price?token_id=${encodeURIComponent(tokenId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = await res.json();
    const price = parseFloat(data.price);
    if (!Number.isFinite(price)) return null;

    return {
      tokenId,
      price,
      probability: price * 100,
    };
  } catch {
    return null;
  }
}

export async function fetchUserPositions(walletAddress: string): Promise<UserPosition[]> {
  try {
    // Use our own proxy to avoid CORS issues in production
    const res = await fetch(
      `/api/positions?wallet=${encodeURIComponent(walletAddress)}`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item: Record<string, unknown>) => Number(item.size ?? item.balance ?? 0) > 0.01)
      .map((item: Record<string, unknown>) => {
        const size = Number(item.size ?? item.balance ?? 0);
        const avgPrice = Number(item.avgPrice ?? item.avg_price ?? item.averagePrice ?? 0);
        const currentPrice = Number(item.currentPrice ?? item.current_price ?? item.price ?? avgPrice);
        const pnl = size * (currentPrice - avgPrice);
        const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

        return {
          market_id: String(item.conditionId ?? item.market_id ?? item.marketId ?? ''),
          question: String(item.title ?? item.question ?? item.market ?? ''),
          outcome: String(item.outcome ?? item.side ?? 'YES'),
          size,
          avg_price: avgPrice,
          current_price: currentPrice,
          pnl,
          pnl_pct: pnlPct,
        };
      });
  } catch {
    return [];
  }
}
