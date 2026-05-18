import { GET } from './route';
import { ARC_DEMO_MARKETS } from '@/lib/data/arcMarkets';

describe('/api/arc-markets route', () => {
  const routeRequest = () => new Request('http://localhost:3000/api/arc-markets');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 5 demo Arc markets with all required fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));

    const response = await GET(routeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(5);

    for (const market of json) {
      expect(market.id).toBeDefined();
      expect(Number.isInteger(market.contractMarketId)).toBe(true);
      expect(market.contractMarketId).toBeGreaterThan(0);
      expect(market.question).toBeDefined();
      expect(typeof market.currentProbability).toBe('number');
      expect(market.currentProbability).toBeGreaterThanOrEqual(0);
      expect(market.currentProbability).toBeLessThanOrEqual(100);
      expect(typeof market.volume).toBe('number');
      expect(market.volume).toBeGreaterThan(0);
      expect(market.active).toBe(true);
      expect(Array.isArray(market.outcomes)).toBe(true);
      expect(market.outcomes).toContain('Yes');
      expect(market.outcomes).toContain('No');
      expect(market.probabilityChange24h).toBeDefined();
      expect(market.probabilityChange7d).toBeDefined();
      expect(market.probabilityChange30d).toBeDefined();
      expect(market.arcStatus).toBe('ready_on_arc');
      expect(market.arcContractMarketId).toBe(market.contractMarketId);
    }
  });

  it('includes the AI agent $1M trade market with highest probability', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));

    const response = await GET(routeRequest());
    const json = await response.json();
    const aiMarket = json.find((m: any) => m.id === 'arc-demo-5');
    expect(aiMarket).toBeDefined();
    expect(aiMarket.currentProbability).toBe(72);
    expect(aiMarket.probabilityChange30d).toBe(45.6);
  });

  it('returns the shared Arc market registry in contract ID order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));

    const response = await GET(routeRequest());
    const json = await response.json();

    expect(json.map((m: any) => ({
      id: m.id,
      question: m.question,
      contractMarketId: m.contractMarketId,
      arcContractMarketId: m.arcContractMarketId,
    }))).toEqual(ARC_DEMO_MARKETS.map((m) => ({
      id: m.id,
      question: m.question,
      contractMarketId: m.contractMarketId,
      arcContractMarketId: m.contractMarketId,
    })));
    expect(json.map((m: any) => m.contractMarketId)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(json.map((m: any) => m.contractMarketId)).size).toBe(json.length);
  });

  it('marks live Polymarket mirrors that are not seeded on Arc as simulation only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([
      {
        id: 'poly-1',
        question: 'A live Polymarket question not seeded on Arc?',
        currentProbability: 42,
        volume: 25000,
        liquidity: 5000,
        endDate: '2026-12-31',
        active: true,
      },
    ])));

    const response = await GET(routeRequest());
    const json = await response.json();

    expect(json).toHaveLength(1);
    expect(json[0].arcMirror).toBe(true);
    expect(json[0].arcStatus).toBe('not_deployed_on_arc');
    expect(json[0].arcContractMarketId).toBeUndefined();
  });
});
