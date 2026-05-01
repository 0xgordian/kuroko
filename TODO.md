# Kuroko — Task Tracker

Last updated: April 28, 2026.

---

## Status Key

- `[x]` Done
- `[ ]` Open
- `[-]` Cancelled / not needed

---

## Completed

### Core Infrastructure
- [x] Next.js 14 App Router setup with TypeScript
- [x] Tailwind CSS with brutalist design system (zero border-radius, orange accent)
- [x] aomi-widget / AomiFrame integration with custom Thread component
- [x] aomi-sdk Session for live trade intent routing
- [x] Para SDK wallet connect (Google, Twitter, Discord, email)
- [x] Server-side aomi proxy with system prompt injection
- [x] Live market context injected on every chat message (top 10 by volume, 24h/7d/30d)
- [x] User positions injected into AI context when wallet connected
- [x] Trade history injected into AI context per message
- [x] Rate limiting: 30/min aomi proxy, 60/min markets API
- [x] Security headers: X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy
- [x] CSRF protection on URL params for trade simulation
- [x] Max request body: 20k chars
- [x] Adaptive market polling: 15s active / 60s idle
- [x] 5-minute server-side market context cache
- [x] Fallback markets updated to 2026

### Pages
- [x] `/` — AI chat with AutoSendBridge, sessionStorage context guard, thread persistence
- [x] `/trade` — Market dashboard with edge scoring, category filter, AI widget, bet simulation
- [x] `/markets` — Full market browser with search, filters, sort, alerts
- [x] `/portfolio` — Positions, chart, alerts, position guards, trade history
- [x] `/execute` — Order terminal with order book, signals, fill tracking, bankroll

### Services
- [x] `marketService.ts` — Gamma API fetch, 2min cache, adaptive polling, refresh subscriptions
- [x] `edgeEngine.ts` — Deterministic scoring 0-100, category filtering, honest labels
- [x] `signalEngine.ts` — Honest signals from order book (spread, activity, movement, liquidity)
- [x] `clobService.ts` — Order book fetch, user positions, token price
- [x] `tradeIntentService.ts` — aomi Session routing, EIP-712 order building, paper-trade fallback
- [x] `orderFillService.ts` — CLOB fill polling every 3s, 60s max, status callbacks
- [x] `orderBuilder.ts` — EIP-712 Polymarket limit order construction
- [x] `positionGuardService.ts` — Stop-loss / take-profit rules, analysis engine, CRUD
- [x] `alertService.ts` — Price alerts, browser notifications, 60s polling
- [x] `bankrollService.ts` — Bankroll tracking, sizing context, category breakdown
- [x] `tradeHistoryService.ts` — localStorage trade log, outcome resolution, CSV export
- [x] `priceHistoryService.ts` — CLOB price history for charts

### Components
- [x] `TopNav` — Fixed header, nav links (AI/Trade/Markets/Portfolio/Execute), wallet status
- [x] `MobileBottomNav` — 5-tab mobile navigation
- [x] `BetSimulation` — Trade confirmation modal with dollar-based sizing, slippage display
- [x] `EdgeResults` — Opportunity cards with scores, reasoning, action buttons
- [x] `MarketFeed` — Live market list with loading skeletons
- [x] `TrendingMarkets` — Top 10 by activity
- [x] `CategoryFilter` — 7-category filter with counts
- [x] `OrderBook` — Bid/ask depth visualization
- [x] `PriceChart` — lightweight-charts + CLOB history
- [x] `PositionPanel` — Open positions table
- [x] `PositionGuardPanel` — Stop-loss / take-profit rule manager with live analysis
- [x] `AlertsPanel` — Price alert manager with notification toggle
- [x] `TradeHistory` — Trade log with aggregate stats (win rate, P&L, avg return) + CSV export
- [x] `PnlCard` — Receipt-style trade card
- [x] `AomiWidget` — Embedded aomi-widget with error boundary
- [x] `ThreadPersist` — Chat thread persistence across navigation
- [x] `RuntimeAgentBridge` — Bridges aomi runtime events to Zustand store
- [x] `QueryBar` — Natural language input with suggestion chips

### Bug Fixes
- [x] `setState` deprecated in aomi-labs/react — replaced with `setApiKey`
- [x] Model select stuck on "Loading..." — removed broken manual session bootstrap
- [x] AI chat auto-firing on navigation — backendUrl was changing every render (included trade history in URL), causing AomiFrame.Root to remount and re-fire AutoSendBridge
- [x] `postState` 404 error overlay in dev — patched console.error to suppress aomi non-fatal errors
- [x] Proxy upstream URL wrong — `https://aomi.dev` → `https://api.aomi.dev`
- [x] `useAomiAuthAdapter` polling — replaced 2s unconditional interval with event-driven approach
- [x] Para singleton — `signTypedData` and `sendTransaction` reuse cached ParaWebModule instance
- [x] `marketService.ts` module-level side effects — moved into `initMarketService()`
- [x] `AlertsPanel` notification toggle bug — state setter shadowed service function
- [x] `edgeEngine.ts` wrong `estimatedReturn` formula — matches BetSimulation now
- [x] `tradeIntentService.ts` dynamic imports on every trade — Session class cached
- [x] Error boundaries on data panels — PriceChart, AlertsPanel, TradeHistory wrapped
- [x] Execute page wallet not wired — `useAomiAuthAdapter` now called, wallet state passed to TopNav
- [x] Execute page paper trade gate — no wallet = paper trade directly, no sendLiveOrder call
- [x] Execute page signing — Para modal opens automatically when SIGNING_REQUIRED returned

---

## Open

### Features
- [ ] Onboarding flow — welcome modal + spotlight tour for first-time users
- [ ] Product rename — change "Kuroko" to new name across entire codebase
- [ ] Market detail page `/market/[slug]` — full order book, price history, AI analysis
- [ ] Search in chat thread sidebar

### Infrastructure
- [ ] WebSocket price feed — replace polling with Polymarket live price stream
- [ ] Server-side edge scoring — incorporate CLOB depth and whale activity signals
- [ ] E2E tests (Playwright)
- [ ] Vercel KV for shared market context cache across instances

### Future
- [ ] Kalshi integration — cross-platform arbitrage detection
- [ ] Desktop app — Tauri-based native app with system tray
