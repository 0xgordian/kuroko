import { GET } from './route';

describe('/api/markets route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns enriched live markets when Gamma succeeds', async () => {
    const mockRequest = new Request('http://localhost/api/markets', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });

    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('gamma-api.polymarket.com')) {
          return new Response(
            JSON.stringify([
              {
                id: 'm1',
                question: 'Test market',
                volume: 1000,
                oneDayPriceChange: null,
                outcomes: '["Yes","No"]',
                clobTokenIds: '["yes-token","no-token"]',
              },
            ]),
            { status: 200 },
          );
        }

        if (url.includes('clob.polymarket.com/prices-history')) {
          return new Response(
            JSON.stringify({
              history: [
                { t: 1, p: 0.4 },
                { t: 2, p: 0.55 },
              ],
            }),
            { status: 200 },
          );
        }

        throw new Error(`Unexpected fetch url: ${url}`);
      });

    const response = await GET(mockRequest as unknown as Parameters<typeof GET>[0]);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].oneDayPriceChange).toBeCloseTo(0.15, 5);
  });
});
