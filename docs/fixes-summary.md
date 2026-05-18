# Kuroko — Fixes Log

Last updated: May 18, 2026.

---

## Critical Fixes

### Backend URL wrong
**Problem:** `NEXT_PUBLIC_BACKEND_URL` was set to `https://aomi.dev` (marketing site) instead of `https://api.aomi.dev` (API endpoint). Every chat message was proxied to the wrong URL.
**Fix:** Updated `.env.local` and hardcoded fallback in proxy route to `https://api.aomi.dev`.

### AI chat auto-firing on navigation
**Problem:** `backendUrl` passed to `AomiFrame.Root` included trade history encoded as base64 in the URL. Trade history changes on every render, so the URL changed, causing `AomiFrame.Root` to remount its runtime, which reset aomi session state, which made `AutoSendBridge` fire the system context send again on every navigation back to `/`.
**Fix:** Removed trade history from the URL. Trade history is injected server-side via the proxy on each message instead.

### `postState` 404 error overlay in dev
**Problem:** Next.js dev overlay intercepts unhandled promise rejections before the `window.addEventListener('unhandledrejection')` handler runs. The aomi client fires a non-fatal `postState` 404 when no API key is configured, which was showing as a full error overlay.
**Fix:** Patched `console.error` in `app-providers.tsx` to filter aomi postState 404 noise. Scoped to component lifecycle, restores original on unmount.

### Model select stuck on "Loading..."
**Problem:** `model-select.tsx` was calling `new URL("/api/state", runtimeBackendUrl)` where `runtimeBackendUrl` was `/api/aomi`. Since `/api/state` is an absolute path, `new URL()` dropped the `/api/aomi` path, producing `http://localhost:3000/api/state` instead of `http://localhost:3000/api/aomi/api/state`. The session bootstrap was hitting the wrong endpoint, getting a 404 (swallowed as `{ ok: true }`), and the retry loop kept spinning.
**Fix:** Removed the manual `bootstrapSessionState` call entirely. The aomi runtime handles session bootstrap internally. `getAvailableModels()` is called directly with exponential backoff retry.

### `setState` deprecated
**Problem:** `useControl().setState({ apiKey })` was deprecated in `@aomi-labs/react`. Used in `app/page.tsx` and `components/AomiWidget.tsx`.
**Fix:** Replaced with `useControl().setApiKey(key)` in both files.

### Execute page wallet not wired
**Problem:** Execute page called `sendLiveOrder` with `walletAddress: ''` even when no wallet was connected, causing the service to return "Wallet signing required" with the full EIP-712 payload as the message.
**Fix:** Added `useAomiAuthAdapter` to execute page. When no wallet connected, skip `sendLiveOrder` entirely and record a paper trade directly. When wallet connected, pass the real address and open Para modal on `SIGNING_REQUIRED` response.

---

## Medium Fixes

### `useAomiAuthAdapter` polling
**Problem:** 2s unconditional polling interval wasted battery on mobile.
**Fix:** Event-driven approach — polls briefly on mount (8s), restarts on `para:modal:open`, stops 5s after `para:modal:close`. Zero polling in steady-state connected session.

### Para singleton
**Problem:** `signTypedData` and `sendTransaction` created a new `ParaWebModule` instance on every call (~50ms overhead).
**Fix:** Cached singleton at module level. Reused across all signing calls.

### `marketService.ts` module-level side effects
**Problem:** Auto-refresh started at import time, causing HMR timer leaks in development.
**Fix:** Moved into `initMarketService()`, called once from `AppProviders`.

### `AlertsPanel` notification toggle bug
**Problem:** Local state setter `setNotifEnabled` shadowed the imported `setNotifEnabled` service function, so toggling notifications updated UI state but never persisted to localStorage.
**Fix:** Renamed local setter to `setNotifEnabledState`, kept service function name intact.

### `edgeEngine.ts` wrong `estimatedReturn` formula
**Problem:** Return was calculated as `(payout / cost) * 100` instead of `((payout - cost) / cost) * 100`, producing inflated return percentages.
**Fix:** Corrected formula to match `BetSimulation` calculation.

### `tradeIntentService.ts` dynamic imports
**Problem:** `@aomi-labs/client` Session class was dynamically imported on every trade, adding 200-500ms latency.
**Fix:** Session class cached at module level after first import.

### Market context cache too short
**Problem:** Server-side market context cache was 1 minute, causing 3 CLOB history calls on every message after cache expiry.
**Fix:** Extended to 5 minutes to match the `/api/markets` cache TTL.

---

## Minor Fixes

- Error boundaries added to `PriceChart`, `AlertsPanel`, `TradeHistory`, `PositionGuardPanel`
- `fallbackMarkets.ts` updated from 2024 to 2026 markets
- `onMarketsRefresh` subscription added to execute page
- `Suspense` wrapper added to execute page export
- Layout class fixed on execute page to match other pages (`pt-12 pb-16 lg:pb-0`)
- `edgeEngine.ts` summary string changed from "STRONG edge" to "STRONG signal"
- Toast style standardized across execute page actions

---

## Arc Product-Readiness Fixes

### Arc market registry and seed alignment
**Problem:** `/api/arc-markets` showed UI markets, but the deployed contract needed matching on-chain markets before `buyShares()` could succeed.
**Fix:** Added the shared registry in `lib/data/arcMarkets.json`, typed helpers in `lib/data/arcMarkets.ts`, and `npm run seed:arc`. The seed script creates the five shared markets and refuses to append if the deployed contract has drifted from the registry.

### Arc real transaction safety
**Problem:** Arc execution could build a transaction for a UI market that did not exist on-chain or was already resolved.
**Fix:** Added `validateArcMarketForTrade()` in `lib/services/arcContractService.ts`. Execute and chat-card flows now check contract config, numeric `contractMarketId`, on-chain existence, question match, unresolved state, and positive amount before sending a real tx.

### Arc buyShares amount math
**Problem:** The Arc transaction value math mixed BigInt literal conversion and could be confusing around native USDC decimals.
**Fix:** Standardized value as `priceCents * shares * 1e16`, matching 18-decimal native USDC where 100 cents equals 1 USDC.

### Arc transaction feedback
**Problem:** Arc execution did not clearly distinguish preparing, wallet approval, submitted, confirmed, and failed states.
**Fix:** Execute page now tracks Arc tx phases, shows submitted tx hash, waits for confirmation, refreshes Portfolio reads, and links to the Arc explorer.

### Live Polymarket mirror on Arc
**Problem:** Arc mode was limited to static demo markets, which made it feel less like the real product.
**Fix:** `/api/arc-markets` now attempts to mirror live `/api/markets` data and annotates each market with `arcStatus`. Seeded markets are `ready_on_arc`; unseeded mirrored markets are simulation-only.

### Chat trade card parser
**Problem:** The AI sometimes returned `EXECUTE_BUY` JSON with `outcome` and `price_per_share`, which rendered as a raw code block with only a Copy button.
**Fix:** `TradeCard` now normalizes both canonical `trade_card` JSON and aomi-style `EXECUTE_BUY` JSON into one interactive card shape.

### Raw JSON black block in chat
**Problem:** Even when a trade card was detected, the raw JSON block was still rendered above the card, creating a black rectangle that covered or interrupted text.
**Fix:** `thread.tsx` strips trade-card JSON from the visible Markdown once a card is detected, then renders only the explanation and the interactive card.

### Hidden Arc instruction leakage
**Problem:** Arc-specific steering text was appended to the user-visible message, so it appeared in the chat transcript.
**Fix:** Moved the trade-intent steering into the injected system prompt instead of mutating the visible `message` param.

### aomi Arc DEX confusion
**Problem:** The backend sometimes treated "simulate a trade on Arc" as a DEX/token swap and asked for routers, pools, token pairs, or balances.
**Fix:** Strengthened the Arc system prompt: in Kuroko, "trade" means prediction-market order unless the user explicitly asks for swap/DEX/router/pool/bridge/token pair. The prompt also says not to invent market names and to use only injected live data.

### Para stale overlay cleanup
**Problem:** After Para login, a stale dark overlay could remain fixed on-screen and block chat text.
**Fix:** `ParaBackdrop` now aggressively detects and clears stale Para modal overlays after the modal closes.

### Responsive TopNav collision
**Problem:** Nav buttons could collide when the viewport narrowed.
**Fix:** TopNav was changed to a responsive grid layout with desktop nav only at larger widths, hamburger behavior below that, and safer right-side status wrapping.

### Stale Next.js build cache
**Problem:** `.next` sometimes produced missing chunk/page errors such as `Cannot find module './1682.js'`.
**Fix:** Added and documented `npm run dev:clean`; clean recovery is `rm -rf .next` then rebuild/dev.
