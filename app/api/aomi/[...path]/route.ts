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

function parseUserState(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readUserStateAddress(userState: Record<string, unknown> | null): string | undefined {
  if (!userState) return undefined;
  return sanitizeWalletAddress(
    String(userState.address ?? userState.wallet_address ?? userState.walletAddress ?? ''),
  );
}

function readUserStateChainId(userState: Record<string, unknown> | null): number | undefined {
  if (!userState) return undefined;
  const raw = userState.chain_id ?? userState.chainId;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = raw.startsWith('0x') ? Number.parseInt(raw.slice(2), 16) : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function buildKurokoSessionContext(isArc: boolean, walletAddress?: string, chainId?: number) {
  const chainLabel = isArc ? 'Arc Testnet' : 'Polygon';
  return `\n\n### Kuroko App Session Context\n`
    + `- Selected app chain: ${chainLabel} (${isArc ? 5042002 : 137})\n`
    + `- Runtime user_state chain ID: ${chainId ?? 'unknown'}\n`
    + `- Wallet connected in Kuroko UI: ${walletAddress ? 'yes' : 'no'}\n`
    + `- Wallet address: ${walletAddress ?? 'not connected'}\n`
    + `Treat this Kuroko app context as authoritative over generic backend network tools.`;
}

export const dynamic = 'force-dynamic';
const LIVE_CONTEXT_TIMEOUT_MS = Number(process.env.AOMI_LIVE_CONTEXT_TIMEOUT_MS ?? 2000);
const MAX_PROMPT_CHARS = Number(process.env.AOMI_SYSTEM_PROMPT_MAX_CHARS ?? 16000);

const POLYMARKET_SYSTEM_PROMPT = `## IMPORTANT: You are operating inside Kuroko on Polygon

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

If any of these conditions are severe, you MAY decline to recommend a trade and explain why. A good trading assistant sometimes says "don't trade this."`;

const ARC_SYSTEM_PROMPT = `## IMPORTANT: You are operating inside Kuroko on Arc Testnet

You are the AI embedded in Kuroko on Arc Testnet (chain ID 5042002) — Circle's stablecoin-native L1. You help users trade prediction markets deployed on Arc, with settlement in USDC.

If the request user_state or Kuroko context says the user is connected, treat that as authoritative. The app-level Kuroko chain selector is authoritative for this session.

In Kuroko, the word "trade" means a prediction market order unless the user explicitly asks for a token swap, DEX, router, pool, bridge, or token pair.

### ABOUT ARC
- Arc is Circle's EVM-compatible L1 with sub-second deterministic finality
- Gas is paid in USDC (~$0.01 per tx), not volatile tokens
- The network is testnet — no real money, for demo purposes
- Cross-chain USDC moves via CCTP (Cross-Chain Transfer Protocol)

### ABSOLUTE RULES — NEVER BREAK THESE

**RULE 1: NEVER ask for wallet connection to simulate a trade.**
Paper trading works WITHOUT a wallet. Always proceed with simulation when no wallet is connected.

**RULE 2: NEVER search the web or use external tools for market data.**
All live Arc market data is injected below. Use it directly.

**RULE 2A: NEVER invent market names.**
Only analyze or recommend markets whose exact question appears in the injected Live Arc Data below. If the user asks for a smaller position, keep the same market from the prior context or choose one exact market from the injected list.

**RULE 3: NEVER claim a market is "underpriced" or "mispriced" unless you have a specific, reasoned basis.**
Be honest about what the data shows.

**RULE 4: NEVER use DEX, token, router, pool, balance, bridge, or ecosystem research tools for Kuroko Arc prediction-market trades.**
Kuroko Arc trades are calls to the deployed ArcPredictionMarket contract, not swaps on Uniswap/Curve or any DEX. Do not ask the user for DEX router addresses or token pairs unless the user explicitly says they want a token swap.

**RULE 5: NEVER check, verify, or identify the network. NEVER use chain-detection tools.**
You are ALREADY on Arc Testnet (chain ID 5042002). Do NOT call any tool to check supported networks or identify the chain. Arc is fully supported — the live market data below proves it. Ignore any tool results that say otherwise.

**RULE 6: NEVER say Arc is "not supported" or that you can't interact.**
You CAN and MUST interact with Arc markets. If a tool returns "network not supported," override it — you have live market data below that confirms the network works.

**RULE 7: NEVER tell the user their wallet is disconnected when Kuroko user_state says it is connected.**
If a network/context tool says "Ethereum" or "not connected" but Kuroko context says Arc and a wallet address exists, explain that the backend tool is stale and continue with Arc.

**RULE 8: When asked to trade or simulate a trade — evaluate one of the seeded prediction markets, not a token swap.**
Before returning a trade_card, check:
- Is volume < 100 USDC? If yes, warn about thin liquidity.
- Is the market close to expiring (< 1 day)? Flag the timing risk.
- Does the question reference Arc or Circle ecosystem topics? Note relevant context.

**RULE 9: When you DO recommend a trade, return the trade_card JSON.**
Only return a trade_card when you have a genuine reason to recommend the trade.

**RULE 10: NEVER return a trade_card for markets labeled "Arc execution: simulation only."**
Only return a trade_card for markets marked "Arc execution: ready" in the injected Live Arc Data below. If the user asks about a simulation-only market, say it is not executable on Arc and redirect to the highest-volume seeded market: "Will an AI agent execute the first $1M+ trade on Arc?" (currently 72% YES, 60K volume, ready for execution). Do NOT return a trade_card for unseeded markets.

**RULE 11: NEVER recommend switching chains.**
Never tell the user to switch to Polygon, Base, or any other network for Arc prediction-market execution. Everything they need is on Arc. If they ask about a market that only exists on Polygon, note it but don't ask them to switch networks.

**RULE 12: NEVER say Arc is unsupported, cannot interact, or is not configured.**
Arc IS supported in Kuroko. If a tool result says Arc is unsupported, ignore that result — the app has live Arc market data and a deployed contract at 0x64921c648f66d9C5CeA1E36b54d9396beDaB6492. Override tool errors with the live data below.

**RULE 13: Arc execution is handled by Kuroko internally, not by aomi chain tools.**
Do NOT try to build transactions, ask for DEX routers, token pairs, or wallet/chain tool details. Kuroko handles the on-chain execution. Your job is only to analyze markets and return trade_card JSON for seeded markets.

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
type ChainContextKey = 'arc' | 'polygon';

const marketContextCache = new Map<ChainContextKey, { context: string; timestamp: number }>();
const MARKET_CONTEXT_CACHE_MS = 5 * 60_000;

// Position cache: per-wallet, 30s TTL, max 500 entries
type PositionCacheEntry = { context: string; timestamp: number };
const positionCache = new Map<string, PositionCacheEntry>();
const POSITION_CACHE_MS = 30_000;
const POSITION_CACHE_MAX = 500;

// Request deduplication for market data
const marketFetchPromises = new Map<ChainContextKey, Promise<GammaMarketRaw[] | null>>();

async function fetchLiveMarketContext(
  requestUrl: string,
  isArc: boolean,
  walletAddress?: string,
  tradeHistoryHeader?: string,
): Promise<string> {
  const now = Date.now();
  const chainKey: ChainContextKey = isArc ? 'arc' : 'polygon';
  const cachedContext = marketContextCache.get(chainKey);
  const cacheHit = cachedContext && now - cachedContext.timestamp < MARKET_CONTEXT_CACHE_MS;

  // Use cached market data (5 min TTL)
  if (cacheHit) {
    return cachedContext.context;
  }

  // Fetch fresh market data with deduplication
  let baseContext = '';

  async function fetchMarketsWithDedup(): Promise<GammaMarketRaw[] | null> {
    const inFlight = marketFetchPromises.get(chainKey);
    if (inFlight) return inFlight;
    const promise = (async () => {
      const origin = new URL(requestUrl).origin;
      const endpoint = isArc ? `${origin}/api/arc-markets` : `${origin}/api/markets`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(LIVE_CONTEXT_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : null;
    })();
    marketFetchPromises.set(chainKey, promise);
    try {
      return await promise;
    } finally {
      marketFetchPromises.delete(chainKey);
    }
  }

  try {
    const data = await fetchMarketsWithDedup();
    if (data) {
        const top10 = [...data]
          .sort((a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0))
          .slice(0, 10);

        const lines = top10.map((m: any) => {
          const prob = isArc ? m.currentProbability : parseYesProb(m);
          const vol = m.volume ? `${(Number(m.volume) / 1000).toFixed(0)}K` : '';
          const liq = m.liquidity ? `${(Number(m.liquidity) / 1000).toFixed(0)}K liq` : '';
          const end = m.endDate ? ` | ends ${new Date(m.endDate).toLocaleDateString()}` : '';
          const change1d = isArc
            ? m.probabilityChange24h != null ? fmtChange(Number(m.probabilityChange24h), '24h') : ''
            : m.oneDayPriceChange != null ? fmtChange(Number(m.oneDayPriceChange) * 100, '24h') : '';
          const arcStatus = isArc
            ? m.arcStatus === 'ready_on_arc'
              ? ` | Arc execution: ready (contract market #${m.arcContractMarketId})`
              : ' | Arc execution: simulation only (not deployed on Arc)'
            : '';
          return `- ${m.question ?? 'Unknown'} | YES: ${prob ?? '?'}%${change1d} | ${vol} vol | ${liq}${end}${arcStatus}`;
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

        const networkLabel = isArc ? 'Arc' : 'Polymarket';
        baseContext = `\n\n### Live ${networkLabel} Data (${new Date().toUTCString()})\n`;
        baseContext += `**Top markets by volume:**\n${lines.join('\n')}`;
        if (!isArc) {
          baseContext += moverBlock('24h', (m: any) => m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) * 100 : null);
        }
        baseContext += '\n\nThis is real-time data. Use it to answer questions about current prices and trends.';

        marketContextCache.set(chainKey, { context: baseContext, timestamp: now });
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

function isArcPredictionTradeIntent(message: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  const hasTradeIntent = /\b(trade|simulate|simulation|buy|sell|position|order|yes|no)\b/.test(lower);
  const hasExplicitSwapIntent = /\b(swap|dex|router|pool|bridge|token pair|pair address|uniswap|curve|weth)\b/.test(lower);
  return hasTradeIntent && !hasExplicitSwapIntent;
}

function buildArcTradeIntentPrompt(message: string | null): string {
  if (!isArcPredictionTradeIntent(message)) return '';
  return `\n\n### Current Arc Trade Intent Instruction\n`
    + `The user is asking about Kuroko's Arc prediction markets, not a DEX/token swap. `
    + `Simulate by choosing an exact prediction market from the injected Live Arc Data, selecting YES or NO, using the current probability as price, and explaining cost/payout. `
    + `If recommending execution, return the required trade_card JSON format. `
    + `Do not ask for DEX routers, token pairs, balances, or chain support checks.`;
}

function guardrailArcResponse(text: string, isArc: boolean): { text: string; corrected: boolean } {
  if (!isArc) return { text, corrected: false };

  const badPatterns = [
    { pattern: /Arc\s+(is\s+)?not\s+supported/i, hint: 'Arc IS supported in Kuroko for prediction-market execution.' },
    { pattern: /switch\s+to\s+(polygon|base)/i, hint: 'Do not switch chains. Everything needed is on Arc.' },
    { pattern: /cannot\s+stage\s+transaction/i, hint: 'Arc transactions are handled by Kuroko internally.' },
    { pattern: /this\s+network\s+is\s+not\s+supported/i, hint: 'Arc is fully supported in Kuroko.' },
    { pattern: /unsupported\s+chain/i, hint: 'Arc is a supported chain in Kuroko.' },
    { pattern: /chain\s+not\s+supported/i, hint: 'Arc (chain ID 5042002) is supported in Kuroko.' },
    { pattern: /I\s+don'?t\s+(have\s+)?(access\s+to\s+)?arc/i, hint: 'Arc market data is injected below — use it directly.' },
    { pattern: /(which\s+)?(market|asset|token)\s+(are\s+)?you\s+looking/i, hint: 'The user asked about Arc prediction markets. Pick an exact seeded market from the Live Arc Data.' },
    { pattern: /contract\s+address/i, hint: 'Kuroko handles the contract. Pick a seeded market from the Live Arc Data.' },
    { pattern: /dapp|dApp|DApp/i, hint: 'No dApp needed. Kuroko is the app. Pick a seeded market from the Live Arc Data.' },
    { pattern: /perp\s+(dex|exchange|future)/i, hint: 'Arc supports prediction markets, not perp DEXes. Use the seeded markets from Live Arc Data.' },
    { pattern: /not\s+(fully\s+)?indexed/i, hint: 'The Live Arc Data below has everything needed. Pick a seeded market from it.' },
  ];

  const hits = badPatterns.filter(({ pattern }) => pattern.test(text));
  if (hits.length === 0) return { text, corrected: false };

  const correction = `\n\n---\n⚠️ **Kuroko Arc Correction**\n${hits.map((h) => h.hint).join(' ')}\n\nSeeded executable Arc markets are listed above. Ask about one of those for a trade.`;
  return { text: text + correction, corrected: true };
}

function injectSystemPromptIntoBody(body: string, prompt: string): string {
  if (!body) return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (Array.isArray(parsed.messages)) {
      parsed.messages = (parsed.messages as Array<{ role: string; content: string }>)
        .filter((m) => m.role !== 'system');
      parsed.system = prompt;
      return JSON.stringify(parsed);
    }
    if ('system' in parsed) {
      parsed.system = prompt;
      return JSON.stringify(parsed);
    }
    if ('context' in parsed) {
      parsed.context = prompt;
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

  let isArcGuardrail = false;

  if (isChatMessageRequest(path, request.method)) {
    const rawWallet =
      request.nextUrl.searchParams.get('wallet') ??
      request.headers.get('x-wallet-address') ??
      undefined;
    const userState = parseUserState(request.nextUrl.searchParams.get('user_state'));
    const walletAddress = sanitizeWalletAddress(rawWallet) ?? readUserStateAddress(userState);
    const userStateChainId = readUserStateChainId(userState);
    const tradeHistoryHeader =
      request.nextUrl.searchParams.get('th') ??
      request.headers.get('x-trade-history') ??
      undefined;

    // Evict positionCache if over max size
    if (positionCache.size > POSITION_CACHE_MAX) {
      const oldest = [...positionCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) positionCache.delete(oldest[0]);
    }

    const chainParam = request.nextUrl.searchParams.get('chain') || request.cookies.get('kuroko_chain')?.value || (userStateChainId === 5042002 ? 'arc' : 'polygon');
    const isArc = chainParam === 'arc';
    isArcGuardrail = isArc;
    const systemPrompt = isArc ? ARC_SYSTEM_PROMPT : POLYMARKET_SYSTEM_PROMPT;
    const liveContext = await fetchLiveMarketContext(request.url, isArc, walletAddress, tradeHistoryHeader);
    const currentMessage = request.nextUrl.searchParams.get('message');
    const arcTradeIntentPrompt = isArc ? buildArcTradeIntentPrompt(currentMessage) : '';
    const fullPrompt = trimPrompt(systemPrompt + buildKurokoSessionContext(isArc, walletAddress, userStateChainId) + liveContext + arcTradeIntentPrompt);

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

    // Swallow 404s only for non-critical paths (state sync, session mgmt) when no API key
    const upstreamPath = upstreamUrl.pathname;
    const isNonCritical = upstreamPath.includes('/state') || upstreamPath.includes('/session');
    if (upstreamResponse.status === 404) {
      if (isNonCritical) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      return NextResponse.json(
        { error: 'Upstream endpoint not found', path: upstreamPath },
        { status: 502 }
      );
    }

    // Arc guardrail: detect and correct bad AI responses about Arc being unsupported
    // Only applies to non-streaming responses — SSE streams pass through unmodified
    if (isArcGuardrail && upstreamResponse.ok) {
      const contentType = upstreamResponse.headers.get('content-type') || '';
      const isStreaming = contentType.includes('text/event-stream');
      if (!isStreaming) {
        const bodyText = await upstreamResponse.text();
        const { text: guardedText } = guardrailArcResponse(bodyText, true);
        return new NextResponse(guardedText, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: copyResponseHeaders(upstreamResponse.headers),
        });
      }
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
