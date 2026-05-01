import { NextResponse, type NextRequest } from 'next/server';
import { parseStringArray, getYesTokenId } from '@/lib/services/polymarketData';
import { checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

// Strip characters that could cause parameter pollution against the Gamma API
function sanitizeQuery(raw: string): string {
  return raw.replace(/[&=?#%]/g, '').slice(0, 200).trim();
}

type GammaMarket = {
  question?: string;
  slug?: string;
  outcomePrices?: string | string[];
  volume?: number;
  liquidity?: number;
  oneDayPriceChange?: number | null;
  endDate?: string;
  clobTokenIds?: unknown;
  outcomes?: unknown;
  [key: string]: unknown;
};

function parseYesProb(raw: GammaMarket): number | null {
  try {
    const prices = typeof raw.outcomePrices === 'string'
      ? JSON.parse(raw.outcomePrices) as string[]
      : (raw.outcomePrices ?? []);
    return Math.round(parseFloat(String(prices[0] ?? '0')) * 100);
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown';

  if (!(await checkRateLimit('search', clientIp, 60, 60))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const rawQ = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const q = sanitizeQuery(rawQ);
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '20'), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    // Search Gamma API directly with the query — supports full-text search
    const url = new URL('https://gamma-api.polymarket.com/markets');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('active', 'true');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('_q', q); // Gamma full-text search param

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Gamma API ${res.status}`);

    const data = await res.json() as GammaMarket[];
    if (!Array.isArray(data)) throw new Error('Invalid response');

    // Also do a client-side filter for better matching
    const qLower = q.toLowerCase();
    const filtered = data.filter((m) =>
      m.question?.toLowerCase().includes(qLower) ||
      m.slug?.toLowerCase().includes(qLower)
    );

    const results = (filtered.length > 0 ? filtered : data).slice(0, limit).map((m) => {
      const prob = parseYesProb(m);
      const change = m.oneDayPriceChange != null
        ? `${Number(m.oneDayPriceChange) > 0 ? '+' : ''}${(Number(m.oneDayPriceChange) * 100).toFixed(1)}pp`
        : null;
      return {
        question: m.question ?? 'Unknown',
        slug: m.slug,
        probability: prob != null ? `${prob}%` : '?%',
        change24h: change,
        volume: m.volume ? `$${(Number(m.volume) / 1000).toFixed(0)}K` : '$0',
        liquidity: m.liquidity ? `$${(Number(m.liquidity) / 1000).toFixed(0)}K` : '$0',
        endDate: m.endDate ? new Date(m.endDate).toLocaleDateString() : null,
        tokenId: getYesTokenId(m),
      };
    });

    return NextResponse.json({ query: q, count: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
