# Implementation Tasks

- [x] 1. Remove dead code from aomi proxy route
  - [x] 1.1 Delete `fetchPriceChange` function
  - [x] 1.2 Delete `EnrichedMarket` type alias
  - [x] 1.3 Delete `getTokenId` function
  - [x] 1.4 Delete `positionCache` map and `PositionCacheEntry` type
  - [x] 1.5 Delete `POSITION_CACHE_MS` constant

- [x] 2. Implement wallet position injection into AI context
  - [x] 2.1 Add `positionCache` map and `POSITION_CACHE_MS` (30s TTL) for per-wallet caching
  - [x] 2.2 Add `fetchPositionContext(origin, walletAddress)` helper that calls `/api/positions`
  - [x] 2.3 Update `fetchLiveMarketContext` to call `fetchPositionContext` and append result to `baseContext`
  - [x] 2.4 Remove unused `walletAddress` and `tradeHistoryHeader` variable warnings

- [x] 3. Add cold start warnings to rate limiters
  - [x] 3.1 Add production cold start warning to aomi proxy rate limit map
  - [x] 3.2 Add production cold start warning to CLOB proxy rate limit map

- [x] 4. Simplify duplicate system prompt in chat page
  - [x] 4.1 Replace full `SYSTEM_CONTEXT` constant with minimal session-identification message

- [x] 5. Add rate limiting to /api/markets/search
  - [x] 5.1 Add in-memory rate limit map (60/min per IP)
  - [x] 5.2 Add `checkSearchRateLimit` function
  - [x] 5.3 Call rate limit check at top of GET handler

- [x] 6. Harden CLOB proxy with rate limiting and body size limit
  - [x] 6.1 Add in-memory rate limit map (60/min per IP) to CLOB proxy
  - [x] 6.2 Add `checkClobRateLimit` function
  - [x] 6.3 Add 20k character body size guard returning 413
  - [x] 6.4 Call rate limit check in proxy function

- [x] 7. Install posthog-js and implement PostHog analytics
  - [x] 7.1 Install posthog-js package
  - [x] 7.2 Create `lib/posthog.ts` with `initPostHog` and `capturePostHogEvent`
  - [x] 7.3 Update `lib/analytics.ts` to initialize PostHog and call `capturePostHogEvent`

- [x] 8. Create Sentry instrumentation files and wire captureError
  - [x] 8.1 Create `sentry.client.config.ts`
  - [x] 8.2 Create `sentry.server.config.ts`
  - [x] 8.3 Create `sentry.edge.config.ts`
  - [x] 8.4 Update `lib/errorTracking.ts` to call `Sentry.captureException` when DSN is set

- [x] 9. Wire ErrorBoundary to captureError
  - [x] 9.1 Import `captureError` in `components/ui/error-boundary.tsx`
  - [x] 9.2 Call `captureError` in `componentDidCatch`

- [x] 10. Add bankroll input validation
  - [x] 10.1 Add `bankrollError` state to ExecuteContent
  - [x] 10.2 Update `handleSaveBankroll` to validate and set error
  - [x] 10.3 Render inline error message below bankroll input
  - [x] 10.4 Clear error on input change

- [x] 11. Fix global alert poller timer leak
  - [x] 11.1 Store interval ID in `globalAlertPoller.ts`
  - [x] 11.2 Export `stopGlobalAlertPoller` function
  - [x] 11.3 Import and call `stopGlobalAlertPoller` in `GlobalInit` cleanup

- [x] 12. Fix pollOrderFill AbortController leak on execute page
  - [x] 12.1 Add `useEffect` cleanup that calls `pollRef.current?.abort()` on unmount

- [x] 13. Add ARIA labels to OrderBook bid/ask sections
  - [x] 13.1 Add `aria-label="Ask prices"` and `role="list"` to asks container in `OrderBookPanel`
  - [x] 13.2 Add `aria-label="Bid prices"` and `role="list"` to bids container in `OrderBookPanel`
  - [x] 13.3 Add `role="listitem"` to each bid/ask row

- [x] 14. Add accessible focus ring styles
  - [x] 14.1 Add `:focus-visible` CSS rule with `2px solid #ff4500` outline to `app/globals.css`
  - [x] 14.2 Add `:focus:not(:focus-visible)` rule to suppress ring for mouse users
