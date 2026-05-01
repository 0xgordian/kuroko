import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy for individual market lookups — avoids CORS issues with direct Gamma API calls.
 * Used by tradeHistoryService to check resolved outcomes.
 */
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing market id' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets/${encodeURIComponent(id)}`,
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
