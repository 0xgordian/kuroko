import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Proxy for Polymarket user positions — avoids CORS issues with direct Gamma API calls.
 * Rate limited to 60/min per IP. Wallet address validated as a valid Ethereum address.
 */
export const dynamic = 'force-dynamic';

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown';

  if (!(await checkRateLimit('positions', clientIp, 60, 60))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim();
  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
  }

  // Validate Ethereum address — prevents prompt injection and enumeration attacks
  if (!ETH_ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/positions?user=${encodeURIComponent(wallet)}&sizeThreshold=0.01`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Gamma API returned ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
