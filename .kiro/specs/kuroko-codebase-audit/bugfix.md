# Bugfix Requirements Document

## Introduction

This document captures the findings of a comprehensive codebase audit of Kuroko — an AI-native prediction market trading terminal built on Next.js 14, TypeScript, Tailwind CSS, aomi-sdk, Para SDK, and Polymarket's Gamma/CLOB APIs.

The audit covers code quality, error handling, logging, analytics, security, usability, testing, and documentation. The goal is to identify defects, gaps, and regressions that should be addressed to bring the codebase to a production-hardened state.

The project is well-structured and largely functional. The issues identified below are real defects — dead code left in production routes, incomplete integrations that silently no-op, missing input validation, and behavioral gaps that affect reliability and observability.

---

## Bug Analysis

### Current Behavior (Defect)

**Dead Code in Production API Route**

1.1 WHEN the `/api/aomi/[...path]` route handles any request THEN the system contains four declared-but-never-used symbols (`fetchPriceChange`, `EnrichedMarket`, `getTokenId`, `positionCache`, `POSITION_CACHE_MS`) that were part of a removed CLOB enrichment feature, increasing bundle size and causing TypeScript hint noise without serving any function.

1.2 WHEN the `/api/aomi/[...path]` route receives a chat POST with a `wallet` query param or `x-wallet-address` header THEN the system reads those values into `walletAddress` and `tradeHistoryHeader` variables but never uses them — wallet-aware context injection is silently skipped, so the AI never receives the user's open positions even when a wallet is connected.

**Analytics and Error Tracking Are No-Ops**

1.3 WHEN any analytics event is tracked via `trackEvent()` in `lib/analytics.ts` THEN the system logs to console in development but never sends data to PostHog even when `NEXT_PUBLIC_POSTHOG_KEY` is set, because the PostHog SDK is never imported or initialized — the integration is a stub with a comment placeholder.

1.4 WHEN any error is captured via `captureError()` in `lib/errorTracking.ts` THEN the system logs to console but never sends data to Sentry even when `NEXT_PUBLIC_SENTRY_DSN` is set, because `@sentry/nextjs` (which is installed as a dependency) is never imported or initialized — the integration is a stub.

1.5 WHEN the `ErrorBoundary` component catches a React render error THEN the system calls `console.error` but does not call `captureError()`, so component-level crashes are never forwarded to any error tracking system.

**Missing Input Validation**

1.6 WHEN a user submits the bankroll input on the `/execute` page with a value of `0`, a negative number, or a non-numeric string THEN the system silently ignores the input without showing any validation feedback to the user.

1.7 WHEN the `/api/markets/search` route receives a request THEN the system has a route file at `app/api/markets/search/route.ts` that is referenced in the README architecture table but whose implementation has not been audited for rate limiting — unlike `/api/markets` and `/api/aomi`, this route may be missing the IP-based rate limit guard.

1.8 WHEN the CLOB proxy at `/api/clob/[...path]` receives a POST request with a large body THEN the system does not enforce a maximum request body size (unlike the aomi proxy which enforces 20k chars), allowing arbitrarily large payloads to be forwarded to the upstream CLOB API.

**Polling and Timer Leaks**

1.9 WHEN `startGlobalAlertPoller()` is called in `AppProviders` THEN the system starts a `setInterval` with no cleanup mechanism — the interval is never cleared on component unmount, and the `pollerStarted` guard only prevents double-start within a single page session but does not handle hot-module-replacement restarts in development.

1.10 WHEN `pollOrderFill()` is running and the user navigates away from the `/execute` page THEN the system continues polling the CLOB API in the background because the `AbortController` stored in `pollRef` is never used to cancel the in-flight `pollOrderFill` promise — the `pollRef` is created but `pollRef.current.abort()` is never called in a cleanup effect.

**Rate Limiting Resets on Cold Start**

1.11 WHEN the application is deployed to a serverless environment (Vercel) and a new function instance is created THEN the system resets all in-memory rate limit counters (`rateLimitMap`, `marketsRateLimitMap`) to empty, allowing a burst of requests that exceeds the configured limits immediately after each cold start — this is documented in comments but not mitigated.

**Duplicate System Prompt**

1.12 WHEN the AI chat page (`app/page.tsx`) sends the initial `SYSTEM_CONTEXT` message via `AutoSendBridge` THEN the system sends a client-side system prompt that partially duplicates the server-side `POLYMARKET_SYSTEM_PROMPT` injected by the aomi proxy — both define the AI's name, role, and trading rules, creating redundant context that consumes token budget on every session start.

**Missing `@sentry/nextjs` Instrumentation Files**

1.13 WHEN the application starts THEN the system has `@sentry/nextjs` installed as a dependency but lacks the required `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` instrumentation files, so Sentry is completely non-functional despite being listed as a dependency and having a DSN env var slot.

**Accessibility Gaps**

1.14 WHEN a user navigates the market cards on `/markets` using keyboard only THEN the system renders action buttons (Analyze, Set Alert) that have no visible focus ring styled to the design system — the default browser focus outline is suppressed by `outline-none` on inputs without a replacement focus indicator.

1.15 WHEN the `OrderBookPanel` renders bid/ask rows THEN the system uses color alone (red for asks, green for bids) to distinguish the two sides with no text label or ARIA attribute differentiating them for screen reader users.

---

### Expected Behavior (Correct)

**Dead Code Removed**

2.1 WHEN the `/api/aomi/[...path]` route is deployed THEN the system SHALL contain no unused variable declarations — `fetchPriceChange`, `EnrichedMarket`, `getTokenId`, `positionCache`, and `POSITION_CACHE_MS` SHALL be removed.

2.2 WHEN the `/api/aomi/[...path]` route receives a chat POST with a wallet address THEN the system SHALL use the wallet address to fetch and inject the user's open positions into the live market context, so the AI receives position-aware data on every message.

**Analytics and Error Tracking Are Functional**

2.3 WHEN `NEXT_PUBLIC_POSTHOG_KEY` is set and `trackEvent()` is called THEN the system SHALL initialize the PostHog browser SDK and capture the event with the provided properties.

2.4 WHEN `NEXT_PUBLIC_SENTRY_DSN` is set and `captureError()` is called THEN the system SHALL call `Sentry.captureException()` with the error and context, forwarding it to the configured Sentry project.

2.5 WHEN the `ErrorBoundary` component catches a React render error THEN the system SHALL call `captureError()` in `componentDidCatch` so component crashes are tracked in the error monitoring system.

**Input Validation Provides Feedback**

2.6 WHEN a user submits the bankroll input with an invalid value (zero, negative, or non-numeric) THEN the system SHALL display an inline validation error message and SHALL NOT call `setBankroll()` or update the bankroll state.

2.7 WHEN the `/api/markets/search` route receives a request THEN the system SHALL apply the same IP-based rate limiting as the `/api/markets` route (60 requests/min per IP).

2.8 WHEN the CLOB proxy receives a POST request THEN the system SHALL enforce a maximum request body size of 20,000 characters, returning a 413 response for oversized payloads.

**Polling and Timer Cleanup**

2.9 WHEN the `AppProviders` component unmounts THEN the system SHALL clear the global alert polling interval, preventing timer leaks during hot-module-replacement in development.

2.10 WHEN the user navigates away from the `/execute` page while `pollOrderFill()` is running THEN the system SHALL call `pollRef.current.abort()` in a `useEffect` cleanup function, stopping the background polling loop.

**Rate Limiting Resilience**

2.11 WHEN the application is deployed to a serverless environment THEN the system SHALL include a comment-level migration guide in both rate limit implementations pointing to Upstash Redis / Vercel KV as the production-ready replacement, and SHALL log a warning on cold start if `NODE_ENV === 'production'` and no persistent store is configured.

**Single Source of Truth for System Prompt**

2.12 WHEN the AI chat page initializes THEN the system SHALL send only a minimal session-identification message via `AutoSendBridge` (e.g., confirming the app context), deferring all trading rules and market data to the server-side proxy injection, eliminating the duplicate system prompt.

**Sentry Instrumentation Files Present**

2.13 WHEN the application starts THEN the system SHALL have `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` files that initialize Sentry with the DSN from `NEXT_PUBLIC_SENTRY_DSN`, enabling automatic error capture for unhandled exceptions across all runtime environments.

**Accessible Focus and ARIA Labels**

2.14 WHEN a keyboard user focuses any interactive element (button, input, link) THEN the system SHALL display a visible focus indicator using the brand orange (`#ff4500`) outline consistent with the design system, replacing suppressed browser defaults.

2.15 WHEN the `OrderBookPanel` renders bid/ask rows THEN the system SHALL include `aria-label` attributes on the bid and ask sections (e.g., `aria-label="Ask prices"`, `aria-label="Bid prices"`) so screen reader users can distinguish the two sides.

---

### Unchanged Behavior (Regression Prevention)

**Core Trading Flow**

3.1 WHEN a user submits a paper trade on any page THEN the system SHALL CONTINUE TO record the trade to localStorage via `addTradeRecord()` and display a success toast without requiring a wallet connection.

3.2 WHEN a user with a connected wallet submits a live order on `/execute` THEN the system SHALL CONTINUE TO call `sendLiveOrder()`, build the EIP-712 payload, route through the aomi Session, and open the Para signing modal on `SIGNING_REQUIRED`.

3.3 WHEN the aomi proxy receives a chat POST THEN the system SHALL CONTINUE TO inject the `POLYMARKET_SYSTEM_PROMPT` and live market context (top 10 by volume, 24h movers) into every message.

**Market Data Pipeline**

3.4 WHEN `fetchActiveMarkets()` is called and the Gamma API is reachable THEN the system SHALL CONTINUE TO return enriched markets with 24h/7d/30d probability changes, sorted by volume descending.

3.5 WHEN `fetchActiveMarkets()` is called and the Gamma API is unreachable THEN the system SHALL CONTINUE TO return the fallback markets from `lib/data/fallbackMarkets.ts` without throwing.

3.6 WHEN the market service auto-refresh fires THEN the system SHALL CONTINUE TO use the adaptive interval (15s active / 60s idle) and notify all registered `onMarketsRefresh` subscribers.

**Rate Limiting and Security**

3.7 WHEN any IP sends more than 30 requests per minute to `/api/aomi` THEN the system SHALL CONTINUE TO return a 429 response with `Retry-After: 60`.

3.8 WHEN any IP sends more than 60 requests per minute to `/api/markets` THEN the system SHALL CONTINUE TO return a 429 response with `Retry-After: 60`.

3.9 WHEN a chat POST arrives from a cross-origin referrer THEN the system SHALL CONTINUE TO return a 403 CSRF validation error.

3.10 WHEN a request body exceeds 20,000 characters on the aomi proxy THEN the system SHALL CONTINUE TO return a 413 response.

**Edge Engine and Signal Engine**

3.11 WHEN `findEdges()` is called with a list of markets and a query string THEN the system SHALL CONTINUE TO return up to 3 opportunities sorted by edge score descending, with deterministic results for identical inputs.

3.12 WHEN `analyseMarket()` is called with a market and an order book THEN the system SHALL CONTINUE TO return honest signals (TIGHT_SPREAD, HIGH_ACTIVITY, MOVING, LIQUID, NEAR_RESOLUTION, WIDE_SPREAD, LOW_VOLUME) derived only from observable data.

**Alerts and Position Guards**

3.13 WHEN `checkAlerts()` is called with current market probabilities THEN the system SHALL CONTINUE TO mark triggered alerts as inactive, fire browser notifications (if permission granted), and return the list of triggered alerts.

3.14 WHEN `checkGuards()` is called with current market probabilities THEN the system SHALL CONTINUE TO return `GuardAnalysis` objects for guards that have crossed their take-profit or stop-loss thresholds, with correct SELL/REDUCE action and share counts.

**UI Design System**

3.15 WHEN any component is modified THEN the system SHALL CONTINUE TO use zero border-radius, the `#ff4500` brand orange, the defined color palette, and the `panel-bracket` left-accent pattern — no Tailwind default color classes, no rounded corners, no gradients.

3.16 WHEN the TopNav renders THEN the system SHALL CONTINUE TO display at `h-12` height with the correct active link indicator (2px solid orange bottom bar) and wallet status in the right status bar.

**Test Coverage**

3.17 WHEN `npm test` is run THEN the system SHALL CONTINUE TO pass all existing Vitest tests for `edgeEngine`, `polymarketData`, `tradeIntentService`, `/api/markets`, and `/api/aomi` without modification.

3.18 WHEN `npm run lint` is run THEN the system SHALL CONTINUE TO pass ESLint with the `next/core-web-vitals` ruleset.

3.19 WHEN `npm run build` is run THEN the system SHALL CONTINUE TO produce a successful Next.js production build with no TypeScript errors.
