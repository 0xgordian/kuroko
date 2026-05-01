import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/aomi/[...path]/route';

describe('/api/aomi proxy route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies GET requests to the upstream endpoint', async () => {
    const upstreamResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(upstreamResponse);

    const request = new NextRequest('http://localhost:3000/api/aomi/api/state?client_id=abc', {
      method: 'GET',
      headers: { 'X-Session-Id': 'session-1' },
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: ['api', 'state'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'https://api.aomi.dev/api/state?client_id=abc' }),
      expect.objectContaining({
        method: 'GET',
        body: undefined,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('proxies query-only POST requests without forcing a request body', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/markets')) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

    const request = new NextRequest(
      'http://localhost:3000/api/aomi/api/chat?message=hello&app=default',
      {
        method: 'POST',
        headers: {
          'X-Session-Id': 'session-1',
          'X-Api-Key': 'test-key',
        },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ path: ['api', 'chat'] }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/markets',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        href: expect.stringContaining('https://api.aomi.dev/api/chat?message=hello&app=default'),
      }),
      expect.objectContaining({
        method: 'POST',
        body: undefined,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns a 502 json response when upstream fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('boom'));

    const request = new NextRequest('http://localhost:3000/api/aomi/api/state', {
      method: 'GET',
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: ['api', 'state'] }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Aomi upstream request failed',
        message: 'boom',
      }),
    );
  });
});
