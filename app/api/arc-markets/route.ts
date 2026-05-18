import { NextResponse } from 'next/server';
import type { Market } from '@/types';
import { ARC_DEMO_MARKETS, getArcMarketDefinitionByQuestion } from '@/lib/data/arcMarkets';

export const dynamic = 'force-dynamic';

function withArcStatus(market: Market): Market {
  const definition = getArcMarketDefinitionByQuestion(market.question);
  return {
    ...market,
    arcMirror: true,
    arcStatus: definition ? 'ready_on_arc' : 'not_deployed_on_arc',
    arcContractMarketId: definition?.contractMarketId,
  };
}

async function fetchLivePolymarketMarkets(request: Request): Promise<Market[] | null> {
  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/api/markets`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.map(withArcStatus) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const liveMarkets = await fetchLivePolymarketMarkets(request);
  if (liveMarkets?.length) {
    return NextResponse.json(liveMarkets);
  }

  return NextResponse.json(ARC_DEMO_MARKETS.map((market) => ({
    ...market,
    arcMirror: false,
    arcStatus: 'ready_on_arc',
    arcContractMarketId: market.contractMarketId,
  })));
}
