# Kuroko — Task Tracker

Last updated: May 18, 2026.

---

## Status Key

- `[x]` Done
- `[ ]` Open
- `[-]` Cancelled / not needed

---

## Completed

### Core Infrastructure
- [x] Next.js 14 App Router setup with TypeScript
- [x] Tailwind CSS with terminal design system, dark panels, purple/Arc accents, and responsive navigation
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
- [x] Dual-chain support: Polygon/Polymarket + Arc Testnet chain ID 5042002
- [x] Chain selection persisted locally and passed to the AI proxy through `kuroko_chain` cookie
- [x] Arc RPC routing for wallet transactions via `https://rpc.testnet.arc.network`
- [x] Foundry toolchain added for Arc contract compile/deploy
- [x] Shared Arc market registry in `lib/data/arcMarkets.json`
- [x] Arc seed script creates shared markets on-chain and refuses registry drift
- [x] Arc contract deployed at `0x64921c648f66d9C5CeA1E36b54d9396beDaB6492`
- [x] Five shared Arc markets seeded on-chain

### Pages
- [x] `/` — AI chat with AutoSendBridge, sessionStorage context guard, thread persistence
- [x] `/trade` — Market dashboard with edge scoring, category filter, AI widget, bet simulation
- [x] `/markets` — Full market browser with search, filters, sort, alerts
- [x] `/portfolio` — Positions, chart, alerts, position guards, trade history
- [x] `/execute` — Order terminal with order book, signals, fill tracking, bankroll
- [x] `/execute` Arc mode — Arc market loading, on-chain validation, real `buyShares` txs, explorer links, simulation-only disabled states
- [x] `/portfolio` Arc mode — reads `yesShares`/`noShares` from Arc contract and refreshes after trades

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
- [x] `arcContractService.ts` — Arc contract reads, tx payloads, transaction confirmation, market validation
- [x] `arcMarkets.ts` — shared typed helpers for seeded Arc market definitions

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
- [x] `NetworkSelect` — Polygon + Arc Testnet switching without forcing wallet chain switch
- [x] `TopNav` — Arc badge, responsive layout, no nav collision on narrow screens
- [x] `ParaBackdrop` — cleanup for stale Para overlay that could block chat text after login
- [x] `TradeCard` — accepts canonical `trade_card` and aomi-style `EXECUTE_BUY`, hides raw JSON, supports Arc-safe execution

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
- [x] Arc `buyShares` amount math — cost uses 18-decimal native USDC value
- [x] Arc market drift risk — UI and seed script now share one registry
- [x] Arc real tx safety — disables live execution when market missing, resolved, mismatched, or contract config absent
- [x] aomi backend Arc refusal — prompt now treats Kuroko chain/session context as authoritative
- [x] aomi DEX confusion — Arc "trade" means prediction-market order unless user explicitly asks for swap/DEX/router/pool/bridge
- [x] Chat trade card black block — raw JSON is stripped after card detection
- [x] Chat `EXECUTE_BUY` cards — normalized into real interactive cards
- [x] Hidden Arc instructions leaking into chat — moved into system prompt instead of visible message text
- [x] Para stale modal overlay — fixed cleanup so it does not persist as a black screen layer
- [x] Stale `.next` missing chunk/page errors — documented `rm -rf .next` / `dev:clean` recovery

---

## Open

### Features
- [ ] Onboarding flow — welcome modal + spotlight tour for first-time users
- [ ] Product rename — change "Kuroko" to new name across entire codebase
- [ ] Market detail page `/market/[slug]` — full order book, price history, AI analysis
- [ ] Search in chat thread sidebar
- [ ] Add UI flow to seed/deploy new Arc mirror markets without editing JSON by hand
- [ ] Add resolver/admin page for Arc market owner actions
- [ ] Add Arc balance display for native USDC
- [ ] Record and submit Agora demo video
- [ ] Make GitHub repo public after checking history for secrets

### Infrastructure
- [ ] WebSocket price feed — replace polling with Polymarket live price stream
- [ ] Server-side edge scoring — incorporate CLOB depth and whale activity signals
- [ ] E2E tests (Playwright)
- [ ] Vercel KV for shared market context cache across instances
- [ ] Persist seeded Arc market metadata somewhere server-side for multi-env deployments
- [ ] Production-grade Arc explorer/config source once Arc mainnet is live

### Future
- [ ] Kalshi integration — cross-platform arbitrage detection
- [ ] Desktop app — Tauri-based native app with system tray
- [ ] Circle bonus track — CCTP bridge-in or USYC balance display
