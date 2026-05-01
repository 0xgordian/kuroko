import { NextResponse, type NextRequest } from 'next/server';
import {
  derive24hPriceChangeFromHistory,
  getYesTokenId,
} from '@/lib/services/polymarketData';
import { checkRateLimit } from '@/lib/ratelimit';

const HISTORY_ENRICH_LIMIT = Number(process.env.POLYMARKET_HISTORY_ENRICH_LIMIT ?? 60);
const CLOB_HISTORY_URL = 'https://clob.polymarket.com/prices-history';

// Server-side cache — avoids re-fetching on every request
const SERVER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let serverCache: { data: GammaMarket[]; timestamp: number } | null = null;

type GammaMarket = {
  id?: string | number;
  slug?: string;
  volume?: string | number;
  oneDayPriceChange?: number | null;
  sevenDayPriceChange?: number | null;
  thirtyDayPriceChange?: number | null;
  clobTokenIds?: unknown;
  outcomes?: unknown;
  [key: string]: unknown;
};

async function fetchPriceChange(tokenId: string, interval: '1d' | '1w' | '1m'): Promise<number | null> {
  const fidelity = interval === '1d' ? 60 : interval === '1w' ? 360 : 1440;
  const url = new URL(CLOB_HISTORY_URL);
  url.searchParams.set('market', tokenId);
  url.searchParams.set('interval', interval);
  url.searchParams.set('fidelity', String(fidelity));
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return derive24hPriceChangeFromHistory(Array.isArray(data?.history) ? data.history : []);
  } catch {
    return null;
  }
}

// Fetch markets — 2 pages of 500 = 1000 markets, covers all active Polymarket markets
async function fetchAllMarkets(): Promise<GammaMarket[]> {
  const all: GammaMarket[] = [];
  let offset = 0;
  const pageSize = 500;
  const maxPages = 4; // 4 * 500 = 2000 max — more than enough, fast enough

  // Fetch first page to check if there are more
  const firstPage = await fetch(
    `https://gamma-api.polymarket.com/markets?limit=${pageSize}&offset=0&active=true&closed=false`,
    { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) }
  );
  if (!firstPage.ok) return [];
  const firstBatch = await firstPage.json() as GammaMarket[];
  all.push(...(Array.isArray(firstBatch) ? firstBatch : []));

  // If first page was full, fetch remaining pages in parallel
  if (firstBatch.length === pageSize) {
    const remaining = await Promise.allSettled(
      Array.from({ length: maxPages - 1 }, (_, i) => {
        offset = (i + 1) * pageSize;
        const url = `https://gamma-api.polymarket.com/markets?limit=${pageSize}&offset=${offset}&active=true&closed=false`;
        return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) })
          .then((r) => r.ok ? r.json() as Promise<GammaMarket[]> : Promise.resolve([] as GammaMarket[]));
      })
    );
    for (const result of remaining) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        all.push(...result.value);
        if (result.value.length < pageSize) break; // reached end
      }
    }
  }

  return all;
}

async function enrichMarketsWithPriceHistory(markets: GammaMarket[]) {
  const ranked = [...markets].sort(
    (a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0),
  );

  // Enrich top markets with 24h change if missing — parallel, capped
  const targets24h = ranked
    .filter((market) => market.oneDayPriceChange === null || market.oneDayPriceChange === undefined)
    .slice(0, HISTORY_ENRICH_LIMIT);

  await Promise.allSettled(
    targets24h.map(async (market) => {
      const yesTokenId = getYesTokenId(market);
      if (!yesTokenId) return;
      const change = await fetchPriceChange(yesTokenId, '1d');
      if (change !== null) market.oneDayPriceChange = change;
    }),
  );

  // Enrich top 20 with 7d + 30d — keeps extra CLOB calls minimal (40 requests vs 200)
  const targets7d30d = ranked.slice(0, 20);
  await Promise.allSettled(
    targets7d30d.map(async (market) => {
      const yesTokenId = getYesTokenId(market);
      if (!yesTokenId) return;
      const [change7d, change30d] = await Promise.all([
        fetchPriceChange(yesTokenId, '1w'),
        fetchPriceChange(yesTokenId, '1m'),
      ]);
      if (change7d !== null) market.sevenDayPriceChange = change7d;
      if (change30d !== null) market.thirtyDayPriceChange = change30d;
    }),
  );

  return markets;
}

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('cf-connecting-ip')
    ?? 'unknown';

  if (!(await checkRateLimit('markets', clientIp, 60, 60))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Serve from server cache if fresh
  if (serverCache && Date.now() - serverCache.timestamp < SERVER_CACHE_TTL_MS) {
    return NextResponse.json(serverCache.data, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=120' },
    });
  }

  try {
    const markets = await fetchAllMarkets();
    if (!markets.length) {
      return NextResponse.json({ error: 'No markets returned from Gamma API' }, { status: 502 });
    }
    const enrichedMarkets = await enrichMarketsWithPriceHistory(markets);

    // Store in server cache
    serverCache = { data: enrichedMarkets, timestamp: Date.now() };

    return NextResponse.json(enrichedMarkets, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
