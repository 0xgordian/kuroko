import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

// SSRF protection: only allow known aomi backend domains
const ALLOWED_HOSTS = ['api.aomi.dev', 'aomi.dev'];

const UPSTREAM_BASE_URL = (() => {
  const raw =
    process.env.AOMI_UPSTREAM_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AOMI_BASE_URL ||
    'https://api.aomi.dev';
  try {
    const parsed = new URL(raw);
    if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      console.error(`[aomi-proxy] Rejected upstream URL with disallowed host: ${parsed.hostname}. Falling back to api.aomi.dev`);
      return 'https://api.aomi.dev';
    }
    return raw;
  } catch {
    return 'https://api.aomi.dev';
  }
})();

// Wallet address validation — prevents prompt injection via wallet param
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function sanitizeWalletAddress(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return ETH_ADDRESS_RE.test(trimmed) ? trimmed : undefined;
}

export const dynamic = 'force-dynamic';
const LIVE_CONTEXT_TIMEOUT_MS = Number(process.env.AOMI_LIVE_CONTEXT_TIMEOUT_MS ?? 2000);
const MAX_PROMPT_CHARS = Number(process.env.AOMI_SYSTEM_PROMPT_MAX_CHARS ?? 16000);

const POLYMARKET_SYSTEM_PROMPT = `## IMPORTANT: You are operating inside Kuroko

You are NOT a general blockchain assistant. You are the AI embedded in Kuroko — a Polymarket prediction market trading terminal for active traders. You already have all the data you need.

### ABSOLUTE RULES — NEVER BREAK THESE

**RULE 1: NEVER ask for wallet connection to simulate a trade.**
Paper trading works WITHOUT a wallet. Always proceed with paper trade simulation when no wallet is connected.

**RULE 2: NEVER search the web or use external tools for market data.**
All live Polymarket market data is injected below. Use it directly.

**RULE 3: NEVER claim a market is "underpriced" or "mispriced" unless you have a specific, reasoned basis.**
You do not have an independent probability model. You can say "the market has moved significantly" or "volume is high relative to liquidity" — but not "this is underpriced." Be honest about what the data shows.

**RULE 4: When asked to trade — evaluate first, then decide.**
Before returning a trade_card, check:
- Is the spread > 5%? If yes, warn the user and suggest a limit order.
- Is volume < $10k? If yes, warn about thin liquidity and exit risk.
- Is the user already long on this market (check their trade history)? If yes, say so.
- Is the user overexposed to this category (>30% of deployed capital)? If yes, flag it.

If any of these conditions are severe, you MAY decline to recommend a trade and explain why. A good trading assistant sometimes says "don't trade this."

**RULE 5: When you DO recommend a trade, return the trade_card JSON.**
Only return a trade_card when you have a genuine reason to recommend the trade.

### Trade Card JSON Format

Include this at the END of your response when recommending a trade:

\`\`\`json
{
  "action": "trade_card",
  "market": "Exact market question from the data below",
  "side": "YES",
  "shares": 50,
  "price": 45,
  "reasoning": "One specific, honest sentence on why this trade makes sense"
}
\`\`\`

The price = current YES probability (e.g. if market is at 44%, price = 44).
For NO side: price = 100 - probability.

### What good analysis looks like
- Reference specific numbers from the data (probability, volume, 24h change)
- Acknowledge uncertainty — prediction markets are hard
- Compare the market probability to what you'd expect given the underlying event
- Note execution conditions (spread, liquidity) when relevant
- If the user has a position already, factor that into sizing advice

### Live Market Data (use this — do not search externally)`;

// ─── CLOB price history ───────────────────────────────────────────────────────

async function fetchPriceChange(tokenId: string, interval: '1d' | '1w' | '1m'): Promise<number | null> {
  try {
    const fidelity = interval === '1d' ? 60 : interval === '1w' ? 360 : 1440;
    const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500), cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json() as { history?: Array<{ t: number; p: number }> };
    const history = data.history ?? [];
    if (history.length < 2) return null;
    const sorted = [...history].sort((a, b) => a.t - b.t);
    return Math.round((sorted[sorted.length - 1].p - sorted[0].p) * 1000) / 10;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GammaMarketRaw = {
  question?: string;
  outcomePrices?: string | string[];
  volume?: number;
  liquidity?: number;
  oneDayPriceChange?: number | null;
  endDate?: string;
  clobTokenIds?: string | string[];
  outcomes?: string | string[];
};

type EnrichedMarket = GammaMarketRaw & {
  change7d: number | null;
  change30d: number | null;
};

function parseYesProb(m: GammaMarketRaw): number | null {
  try {
    const prices = typeof m.outcomePrices === 'string'
      ? JSON.parse(m.outcomePrices) as string[]
      : (m.outcomePrices ?? []);
    return Math.round(parseFloat(String(prices[0] ?? '0')) * 100);
  } catch { return null; }
}

function getTokenId(m: GammaMarketRaw): string | null {
  try {
    const ids = typeof m.clobTokenIds === 'string'
      ? JSON.parse(m.clobTokenIds) as string[]
      : (m.clobTokenIds ?? []);
    const outcomes = typeof m.outcomes === 'string'
      ? JSON.parse(m.outcomes) as string[]
      : (m.outcomes ?? []);
    const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
    return ids[yesIdx >= 0 ? yesIdx : 0] ?? null;
  } catch { return null; }
}

function fmtChange(v: number | null, label: string): string {
  if (v == null) return '';
  return ` | ${label}: ${v > 0 ? '+' : ''}${v.toFixed(1)}pp`;
}

// ─── Market context cache ─────────────────────────────────────────────────────
// 5 minutes — matches the /api/markets cache TTL.
// CLOB enrichment removed to speed up cache misses.
let marketContextCache: { context: string; timestamp: number } | null = null;
const MARKET_CONTEXT_CACHE_MS = 5 * 60_000;

// Position cache: per-wallet, 30s TTL, max 500 entries
type PositionCacheEntry = { context: string; timestamp: number };
const positionCache = new Map<string, PositionCacheEntry>();
const POSITION_CACHE_MS = 30_000;
const POSITION_CACHE_MAX = 500;

// Request deduplication for market data
let marketFetchPromise: Promise<GammaMarketRaw[] | null> | null = null;

async function fetchLiveMarketContext(
  requestUrl: string,
  walletAddress?: string,
  tradeHistoryHeader?: string,
): Promise<string> {
  const now = Date.now();
  const cacheHit = marketContextCache && now - marketContextCache.timestamp < MARKET_CONTEXT_CACHE_MS;

  // Use cached market data (5 min TTL)
  if (cacheHit) {
    return marketContextCache!.context;
  }

  // Fetch fresh market data with deduplication
  let baseContext = '';

  async function fetchMarketsWithDedup(): Promise<GammaMarketRaw[] | null> {
    if (marketFetchPromise) return marketFetchPromise;
    marketFetchPromise = (async () => {
      const origin = new URL(requestUrl).origin;
      const res = await fetch(`${origin}/api/markets`, {
        signal: AbortSignal.timeout(LIVE_CONTEXT_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json() as GammaMarketRaw[];
      return Array.isArray(data) && data.length > 0 ? data : null;
    })();
    try {
      return await marketFetchPromise;
    } finally {
      marketFetchPromise = null;
    }
  }

  try {
    const data = await fetchMarketsWithDedup();
    if (data) {
        const top10 = [...data]
          .sort((a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0))
          .slice(0, 10);

        const lines = top10.map((m) => {
          const prob = parseYesProb(m);
          const vol = m.volume ? `${(Number(m.volume) / 1000).toFixed(0)}K` : '';
          const liq = m.liquidity ? `${(Number(m.liquidity) / 1000).toFixed(0)}K liq` : '';
          const end = m.endDate ? ` | ends ${new Date(m.endDate).toLocaleDateString()}` : '';
          const change1d = m.oneDayPriceChange != null ? fmtChange(Number(m.oneDayPriceChange) * 100, '24h') : '';
          return `- ${m.question ?? 'Unknown'} | YES: ${prob ?? '?'}%${change1d} | ${vol} vol | ${liq}${end}`;
        });

        const moverBlock = (label: string, getValue: (m: GammaMarketRaw) => number | null) => {
          const sorted = [...data]
            .map((m) => ({ m, v: getValue(m) }))
            .filter(({ v }) => v != null)
            .sort((a, b) => Math.abs(b.v!) - Math.abs(a.v!))
            .slice(0, 4);
          if (!sorted.length) return '';
          return `\n**Biggest ${label} movers:**\n${sorted.map(({ m, v }) =>
            `  ${v! > 0 ? 'UP' : 'DOWN'} ${Math.abs(v!).toFixed(1)}pp -- ${m.question ?? 'Unknown'}`
          ).join('\n')}`;
        };

        baseContext = `\n\n### Live Polymarket Data (${new Date().toUTCString()})\n`;
        baseContext += `**Top markets by volume:**\n${lines.join('\n')}`;
        baseContext += moverBlock('24h', (m) => m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) * 100 : null);
        baseContext += '\n\nThis is real-time data. Use it to answer questions about current prices and trends.';

        marketContextCache = { context: baseContext, timestamp: now };
    }
  } catch {
    // Fall through
  }

return baseContext;
}

// ─── Prompt injection helpers ─────────────────────────────────────────────────

function trimPrompt(input: string): string {
  if (input.length <= MAX_PROMPT_CHARS) return input;
  return `${input.slice(0, MAX_PROMPT_CHARS)}\n\n[Truncated live context to stay within request size budget.]`;
}

function isChatMessageRequest(path: string[], method: string): boolean {
  if (method !== 'POST') return false;
  const joined = path.join('/');
  return joined.includes('messages') || joined.includes('chat') || joined.includes('threads');
}

function injectSystemPromptIntoUrl(url: URL, prompt: string): URL {
  if (!url.searchParams.has('system') && !url.searchParams.has('context')) {
    url.searchParams.set('system', prompt);
  } else if (url.searchParams.has('system')) {
    const existing = url.searchParams.get('system') ?? '';
    url.searchParams.set('system', `${prompt}\n\n${existing}`);
  }
  return url;
}

function injectSystemPromptIntoBody(body: string, prompt: string): string {
  if (!body) return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (Array.isArray(parsed.messages)) {
      parsed.messages = (parsed.messages as Array<{ role: string; content: string }>)
        .filter((m) => m.role !== 'system');
      parsed.system = parsed.system ? `${prompt}\n\n${parsed.system}` : prompt;
      return JSON.stringify(parsed);
    }
    if ('system' in parsed) {
      parsed.system = parsed.system ? `${prompt}\n\n${parsed.system}` : prompt;
      return JSON.stringify(parsed);
    }
    if ('context' in parsed) {
      parsed.context = parsed.context ? `${prompt}\n\n${parsed.context}` : prompt;
      return JSON.stringify(parsed);
    }
    parsed.system = prompt;
    return JSON.stringify(parsed);
  } catch {
    return body;
  }
}

// ─── Proxy core ───────────────────────────────────────────────────────────────

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const upstream = new URL(path.join('/'), `${UPSTREAM_BASE_URL.replace(/\/+$/, '')}/`);
  upstream.search = request.nextUrl.search;
  return upstream;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  return headers;
}

function copyResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete('content-length');
  nextHeaders.delete('content-encoding');
  return nextHeaders;
}

async function proxy(request: NextRequest, path: string[]) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown';

  if (!(await checkRateLimit('aomi', clientIp, 30, 60))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let upstreamUrl = buildUpstreamUrl(request, path);
  const canHaveBody = request.method !== 'GET' && request.method !== 'HEAD';
  let requestBody = canHaveBody ? await request.text() : '';

  if (requestBody.length > 20000) {
    return NextResponse.json(
      { error: 'Request too large', max: 20000, received: requestBody.length },
      { status: 413 }
    );
  }

  if (isChatMessageRequest(path, request.method)) {
    const rawWallet =
      request.nextUrl.searchParams.get('wallet') ??
      request.headers.get('x-wallet-address') ??
      undefined;
    const walletAddress = sanitizeWalletAddress(rawWallet);
    const tradeHistoryHeader =
      request.nextUrl.searchParams.get('th') ??
      request.headers.get('x-trade-history') ??
      undefined;

    // Evict positionCache if over max size
    if (positionCache.size > POSITION_CACHE_MAX) {
      const oldest = [...positionCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) positionCache.delete(oldest[0]);
    }

    const liveContext = await fetchLiveMarketContext(request.url, walletAddress, tradeHistoryHeader);
    const fullPrompt = trimPrompt(POLYMARKET_SYSTEM_PROMPT + liveContext);

    if (requestBody.length > 0) {
      requestBody = injectSystemPromptIntoBody(requestBody, fullPrompt);
    } else {
      upstreamUrl = injectSystemPromptIntoUrl(upstreamUrl, fullPrompt);
    }
  }

  const hasBody = requestBody.length > 0;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: copyRequestHeaders(request),
      body: hasBody ? requestBody : undefined,
      ...(hasBody ? { duplex: 'half' as const } : {}),
      redirect: 'manual',
      cache: 'no-store',
    });

    // Swallow 404s — non-critical endpoints (state sync, session mgmt) when no API key
    if (upstreamResponse.status === 404) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: copyResponseHeaders(upstreamResponse.headers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream proxy error';
    return NextResponse.json(
      { error: 'Aomi upstream request failed', message },
      { status: 502 },
    );
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
