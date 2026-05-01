import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

const CLOB_BASE_URL = 'https://clob.polymarket.com';

export const dynamic = 'force-dynamic';

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const upstream = new URL(path.join('/'), `${CLOB_BASE_URL.replace(/\/+$/, '')}/`);
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

  if (!(await checkRateLimit('clob', clientIp, 60, 60))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const upstreamUrl = buildUpstreamUrl(request, path);
  const canHaveBody = request.method !== 'GET' && request.method !== 'HEAD';
  const requestBody = canHaveBody ? await request.text() : '';

  if (requestBody.length > 20000) {
    return NextResponse.json(
      { error: 'Request too large', max: 20000, received: requestBody.length },
      { status: 413 }
    );
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

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: copyResponseHeaders(upstreamResponse.headers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream proxy error';
    return NextResponse.json(
      { error: 'CLOB upstream request failed', message },
      { status: 502 },
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

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
