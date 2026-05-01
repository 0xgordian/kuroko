# Bugfix Design Document

## Overview

This document describes the precise implementation plan for all 15 defects identified in the Kuroko codebase audit. Each section maps directly to a requirement in `bugfix.md` and specifies exactly which files change and what the change is.

---

## Fix 1 — Remove Dead Code from aomi Proxy (req 1.1 / 2.1)

**File:** `app/api/aomi/[...path]/route.ts`

Remove the following unused declarations:
- `async function fetchPriceChange(...)` — entire function body
- `type EnrichedMarket` — entire type alias
- `function getTokenId(...)` — entire function body
- `const positionCache` — declaration and type alias `PositionCacheEntry`
- `const POSITION_CACHE_MS` — declaration

The `parseYesProb`, `fmtChange`, `GammaMarketRaw` type, and all other used symbols remain untouched.

---

## Fix 2 — Wallet Position Injection into AI Context (req 1.2 / 2.2)

**File:** `app/api/aomi/[...path]/route.ts`

### Current state
`fetchLiveMarketContext(requestUrl, walletAddress?, tradeHistoryHeader?)` accepts these params but ignores them. The market context cache is shared across all users regardless of wallet.

### Design

The wallet position context is **not cached** (positions change frequently). It is fetched fresh on every request when a wallet address is present, with a 30s per-wallet in-memory cache to avoid hammering the Gamma API.

**New cache:**
```typescript
type PositionCacheEntry = { context: string; timestamp: number };
const positionCache = new Map<string, PositionCacheEntry>();
const POSITION_CACHE_MS = 30_000;
```

**New helper `fetchPositionContext(origin, walletAddress)`:**
```typescript
async function fetchPositionContext(origin: string, walletAddress: string): Promise<string> {
  const now = Date.now();
  const cached = positionCache.get(walletAddress);
  if (cached && now - cached.timestamp < POSITION_CACHE_MS) return cached.context;

  try {
    const res = await fetch(
      `${origin}/api/positions?wallet=${encodeURIComponent(walletAddress)}`,
      { signal: AbortSignal.timeout(3000), cache: 'no-store' }
    );
    if (!res.ok) return '';
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) return '';

    const lines = data
      .filter((p) => Number(p.size ?? p.balance ?? 0) > 0.01)
      .slice(0, 10)
      .map((p) => {
        const question = String(p.title ?? p.question ?? p.market ?? 'Unknown');
        const outcome = String(p.outcome ?? p.side ?? 'YES');
        const size = Number(p.size ?? p.balance ?? 0).toFixed(0);
        const avgPrice = Number(p.avgPrice ?? p.avg_price ?? 0);
        const currentPrice = Number(p.currentPrice ?? p.current_price ?? p.price ?? avgPrice);
        const pnl = (Number(size) * (currentPrice - avgPrice)).toFixed(2);
        const pnlSign = Number(pnl) >= 0 ? '+' : '';
        return `- ${question} | ${outcome} | ${size} shares @ ${Math.round(avgPrice * 100)}¢ | current ${Math.round(currentPrice * 100)}¢ | P&L ${pnlSign}$${pnl}`;
      });

    if (lines.length === 0) return '';
    const context = `\n\n### Your Open Positions\n${lines.join('\n')}`;
    positionCache.set(walletAddress, { context, timestamp: now });
    return context;
  } catch {
    return '';
  }
}
```

**Update `fetchLiveMarketContext`:** After building `baseContext`, if `walletAddress` is provided, call `fetchPositionContext` and append the result:
```typescript
if (walletAddress) {
  const origin = new URL(requestUrl).origin;
  const positionCtx = await fetchPositionContext(origin, walletAddress);
  baseContext += positionCtx;
}
```

The `tradeHistoryHeader` param is already injected by the client via the proxy body — no additional server-side handling needed. Remove the unused variable warning by using it in a comment or removing the param from the signature if not needed.

---

## Fix 3 — PostHog Analytics Integration (req 1.3 / 2.3)

**New file:** `lib/posthog.ts`

```typescript
import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(key: string) {
  if (initialized || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false, // we handle manually
    persistence: 'localStorage',
  });
  initialized = true;
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized || typeof window === 'undefined') return;
  posthog.capture(event, properties);
}
```

**Update `lib/analytics.ts`:**
- Import `initPostHog` and `capturePostHogEvent` from `./posthog`
- In `trackEvent()`: if `POSTHOG_KEY` is set, call `initPostHog(POSTHOG_KEY)` then `capturePostHogEvent(event, properties)`
- Remove the placeholder comment

**Install:** `posthog-js` must be added to `package.json` dependencies.

---

## Fix 4 — Sentry Error Tracking Integration (req 1.4 / 2.4 / 1.13 / 2.13)

**New file:** `sentry.client.config.ts` (workspace root)
```typescript
import * as Sentry from '@sentry/nextjs';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV });
}
```

**New file:** `sentry.server.config.ts` (workspace root)
```typescript
import * as Sentry from '@sentry/nextjs';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV });
}
```

**New file:** `sentry.edge.config.ts` (workspace root)
```typescript
import * as Sentry from '@sentry/nextjs';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV });
}
```

**Update `lib/errorTracking.ts`:**
- Import `* as Sentry from '@sentry/nextjs'`
- In `captureError()`: if `SENTRY_DSN` is set, call `Sentry.captureException(error, { extra: context })`
- Keep the `console.error` fallback when DSN is not set

---

## Fix 5 — ErrorBoundary Calls captureError (req 1.5 / 2.5)

**File:** `components/ui/error-boundary.tsx`

In `componentDidCatch(error, errorInfo)`:
- Import `captureError` from `@/lib/errorTracking`
- Call `captureError(error, { context: 'ErrorBoundary', componentStack: errorInfo.componentStack })`
- Keep the existing `console.error` call

---

## Fix 6 — Bankroll Input Validation (req 1.6 / 2.6)

**File:** `app/execute/page.tsx`

Add state: `const [bankrollError, setBankrollError] = useState<string | null>(null);`

Update `handleSaveBankroll`:
```typescript
const handleSaveBankroll = () => {
  const raw = bankrollInput.trim();
  const v = parseFloat(raw);
  if (!raw || !Number.isFinite(v)) {
    setBankrollError('Enter a valid number');
    return;
  }
  if (v <= 0) {
    setBankrollError('Bankroll must be greater than zero');
    return;
  }
  setBankrollError(null);
  setBankroll(v);
  setBankrollState(v);
  toast.success(`Bankroll set to $${v.toLocaleString()}`);
};
```

Render error below the input:
```tsx
{bankrollError && (
  <span className="font-terminal text-[10px]" style={{ color: '#f87171' }}>
    {bankrollError}
  </span>
)}
```

Clear error on input change: `onChange={(e) => { setBankrollInput(e.target.value); setBankrollError(null); }}`

---

## Fix 7 — Rate Limiting on /api/markets/search (req 1.7 / 2.7)

**File:** `app/api/markets/search/route.ts`

Copy the same rate limiting pattern from `/api/markets/route.ts`:
```typescript
const searchRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const SEARCH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SEARCH_MAX_REQUESTS = 60;

function checkSearchRateLimit(ip: string): boolean { /* same pattern */ }
```

Call at the top of the `GET` handler before any processing. Return 429 with `Retry-After: 60` if exceeded.

---

## Fix 8 — CLOB Proxy Body Size Limit and Rate Limiting (req 1.8 / 2.8)

**File:** `app/api/clob/[...path]/route.ts`

Add rate limiting (60/min per IP) using the same in-memory pattern as the aomi proxy.

Add body size guard in `proxy()`:
```typescript
if (requestBody.length > 20000) {
  return NextResponse.json(
    { error: 'Request too large', max: 20000, received: requestBody.length },
    { status: 413 }
  );
}
```

---

## Fix 9 — Global Alert Poller Cleanup (req 1.9 / 2.9)

**File:** `lib/services/globalAlertPoller.ts`

Store the interval ID and export a stop function:
```typescript
let pollerIntervalId: ReturnType<typeof setInterval> | null = null;

export function startGlobalAlertPoller(): void {
  if (typeof window === 'undefined' || pollerStarted) return;
  pollerStarted = true;
  void poll();
  pollerIntervalId = setInterval(poll, 60_000);
}

export function stopGlobalAlertPoller(): void {
  if (pollerIntervalId !== null) {
    clearInterval(pollerIntervalId);
    pollerIntervalId = null;
    pollerStarted = false;
  }
}
```

**File:** `components/app-providers.tsx`

In `GlobalInit.useEffect`:
```typescript
useEffect(() => {
  startGlobalAlertPoller();
  initMarketService();
  // ... existing code ...
  return () => {
    stopGlobalAlertPoller();
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    console.error = origConsoleError;
  };
}, []);
```

Import `stopGlobalAlertPoller` from `@/lib/services/globalAlertPoller`.

---

## Fix 10 — pollOrderFill AbortController Cleanup (req 1.10 / 2.10)

**File:** `app/execute/page.tsx`

Add a cleanup `useEffect` that aborts the poll on unmount:
```typescript
useEffect(() => {
  return () => {
    pollRef.current?.abort();
  };
}, []);
```

This goes alongside the existing `pollRef` declaration. The `pollOrderFill` function already accepts an `AbortController` signal — verify `orderFillService.ts` uses it; if not, pass the signal and check `signal.aborted` in the polling loop.

---

## Fix 11 — Rate Limit Cold Start Warning (req 1.11 / 2.11)

**File:** `app/api/aomi/[...path]/route.ts`

After the `rateLimitMap` declaration, add:
```typescript
// PRODUCTION NOTE: This in-memory rate limit resets on every serverless cold start.
// For production deployments, replace with Upstash Redis or Vercel KV:
// https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
if (process.env.NODE_ENV === 'production') {
  console.warn('[aomi-proxy] Using in-memory rate limiting — resets on cold start. Migrate to Upstash Redis for production.');
}
```

**File:** `app/api/clob/[...path]/route.ts` — same comment after the rate limit map declaration.

---

## Fix 12 — Eliminate Duplicate System Prompt (req 1.12 / 2.12)

**File:** `app/page.tsx`

Replace the full `SYSTEM_CONTEXT` constant (which duplicates `POLYMARKET_SYSTEM_PROMPT`) with a minimal session-identification message:

```typescript
const SYSTEM_CONTEXT = `[Session init] App: Kuroko — AI-native prediction market terminal. Context and trading rules are injected server-side. Acknowledge with a brief greeting.`;
```

This eliminates the ~60-line duplicate of trading rules, name definition, and wallet instructions that are already injected by the server-side proxy on every message.

---

## Fix 13 — OrderBook ARIA Labels (req 1.15 / 2.15)

**File:** `app/execute/page.tsx` — `OrderBookPanel` component

Add `aria-label` to the ask and bid sections:
```tsx
<div className="space-y-0.5 mb-1" aria-label="Ask prices" role="list">
  {/* ask rows */}
</div>
<div className="space-y-0.5 mt-1" aria-label="Bid prices" role="list">
  {/* bid rows */}
</div>
```

Also add `role="listitem"` to each row div.

If a standalone `OrderBook.tsx` component exists, apply the same labels there.

---

## Fix 14 — Focus Ring Accessibility (req 1.14 / 2.14)

**File:** `app/globals.css`

Add after the existing scrollbar styles:
```css
/* Accessible focus ring — replaces suppressed browser default */
:focus-visible {
  outline: 2px solid #ff4500 !important;
  outline-offset: 2px;
}

/* Remove outline only for mouse users (pointer events) */
:focus:not(:focus-visible) {
  outline: none;
}
```

This restores keyboard navigation focus indicators using the brand orange, consistent with the design system, while not showing the ring for mouse clicks.

---

## Fix 15 — posthog-js Dependency

**File:** `package.json`

Add to `dependencies`:
```json
"posthog-js": "^1.240.0"
```

---

## Implementation Order

Execute in this sequence to avoid dependency issues:

1. Fix 1 — Remove dead code (no deps)
2. Fix 11 — Cold start warnings (no deps)
3. Fix 12 — Simplify system prompt (no deps)
4. Fix 7 — Search route rate limiting (no deps)
5. Fix 8 — CLOB proxy hardening (no deps)
6. Fix 2 — Wallet position injection (depends on Fix 1 cleanup)
7. Fix 15 — Install posthog-js
8. Fix 3 — PostHog analytics
9. Fix 4 — Sentry instrumentation files
10. Fix 5 — ErrorBoundary captureError
11. Fix 6 — Bankroll validation
12. Fix 9 — Alert poller cleanup
13. Fix 10 — pollOrderFill abort cleanup
14. Fix 13 — OrderBook ARIA labels
15. Fix 14 — Focus ring CSS

---

## Regression Prevention

All changes are additive or surgical replacements. No service interfaces change. No component APIs change. Existing tests for `edgeEngine`, `polymarketData`, `tradeIntentService`, `/api/markets`, and `/api/aomi` continue to pass without modification.
