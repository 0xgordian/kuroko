# Kuroko — Fixes Log

All bugs resolved as of April 28, 2026.

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
