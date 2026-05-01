# Kuroko — Full Product Review

> A complete A-Z breakdown of what has been built, page by page, service by service, and why it matters.

---

## What This Is

A full-stack AI-powered prediction market trading terminal. Not a demo. Not a prototype. A real product with 5 pages, 15+ services, and a coherent architecture that combines real-time market data, intelligent edge detection, wallet-integrated trade execution, and automated risk management — all inside a brutalist terminal UI. Built in 3 days. Production-ready.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript |
| AI | aomi-widget (embedded chat) + aomi-sdk Session (trade routing) |
| Wallet | Para SDK (Google, Twitter, Discord, email auth) |
| Markets | Polymarket Gamma API (live data) + CLOB proxy (order books) |
| Storage | localStorage (trades, alerts, guards, bankroll) |
| Styling | Tailwind CSS + inline styles (brutalist design system) |

---

## Design Principles

1. Paper-trade first — everything works without a wallet or API key
2. Live-ready — wallet + aomi API key enables real execution on Polygon
3. Stateless backend — proxy pattern for market data + system prompt injection
4. Terminal aesthetic — zero border-radius, monospace typography, orange accent #ff4500
5. Honest signals — no fabricated labels, only observable data

---

## Pages

### / — AI Chat

The core of the product. A full-screen AI assistant with live Polymarket data injected into every message.

What it does:
- Embedded AomiFrame chat interface with custom thread rendering
- System prompt injected once per session (survives navigation via sessionStorage)
- Every message enriched server-side with top 10 markets by volume, 24h/7d/30d probability changes, biggest movers, and user open positions if wallet connected
- ?q= URL param auto-sends a query on load — enables deep linking from other pages
- AI can return trade_card JSON which renders as an interactive confirmation card inline in chat
- shareToChat integration — trade confirmations flow back into the thread automatically
- Wallet status shown in TopNav: Signing Ready (connected) or Paper Mode (no wallet)

Data flow:
1. Markets load from /api/markets on mount
2. User sends message — proxy enriches with live context — aomi backend processes
3. AI responds with analysis or trade_card JSON
4. User confirms trade — sendLiveOrder or paper trade recorded
5. Result shared back to chat thread via shareToChat

---

### /trade — Market Dashboard

Where traders hunt for opportunities. 1000+ live markets scored and filtered.

What it does:
- Live market feed refreshed every 15s active / 60s idle
- Edge engine scores every market 0-100 on volume, liquidity, uncertainty, 24h movement
- Category filters: Elections, Crypto, Sports, Economics, Tech, World
- Natural language query bar — findEdges() filters and scores, returns top 3 opportunities
- Simulate Bet fetches real CLOB best-ask price before opening the modal
- AI widget embedded on right column, toggleable on desktop
- Position panel shows open positions if wallet connected
- Deep link support: /trade?simulate=MARKET_ID&side=YES&shares=50 auto-opens simulation modal

Layout:
- Desktop: 3-column (markets + trending + AI panel) or 2-column when AI closed
- Mobile: Tab-based (Markets, Trending, Analysis, AI)

Edge scoring algorithm:
- Volume: >$1M = 30pts, >$500K = 20pts, >$100K = 10pts, else 5pts
- Liquidity: >$100K = 20pts, >$50K = 12pts, >$10K = 6pts
- Uncertainty: near 50% = 30pts, within 20pp = 20pts, within 30pp = 10pts, else 5pts
- 24h movement: >10pp = 20pts, >5pp = 12pts, >2pp = 6pts
- Result: 0-100 score mapped to STRONG / MODERATE / WEAK

---

### /markets — Market Browser

Full catalog with advanced filtering. The Bloomberg terminal view.

What it does:
- Real-time text search across all market questions
- Category filter: 7 categories
- Probability range filter: min/max 1-99%
- Volume filter: All, >$10K, >$100K, >$1M
- Sort options: Volume, Probability, 24h/7d/30d change, Expiry
- Market cards show: question, probability, 24h/7d/30d changes, volume, liquidity, expiry
- Set price alerts directly from any market card
- Analyze button links to /trade with market pre-selected

Persistence:
- Active category and sort saved to localStorage
- Filters reset on demand

---

### /portfolio — Position and Risk Management

Where you manage what you own and protect it.

What it does:
- Summary: total value, unrealized P&L, position count
- Live positions from Polymarket Gamma API (wallet required)
- Price chart: lightweight-charts + CLOB history for any selected market
- Price alerts: threshold-based with browser notifications, 60s polling
- Position guards: automated stop-loss and take-profit rules
- Trade history: all paper and live trades with resolved P&L
- Aggregate stats: trades count, total deployed, realized P&L, win rate, avg return
- CSV export of full trade history

Layout:
- Desktop: 3-column (summary + positions, chart, alerts + guards)
- Mobile: 5-tab layout (Portfolio, Chart, Alerts, Guards, History)

Key services:
- fetchUserPositions() — fetches open positions from Polymarket
- checkTradeOutcomes() — polls Gamma API for resolved markets, updates paper trade P&L
- checkAlerts() — evaluates price alerts every 60s
- checkGuards() — evaluates position guards every 60s

---

### /execute — Order Terminal

The most sophisticated page. Direct order execution with live order book and fill tracking.

What it does:
- Market picker: search and select from 1000+ markets
- Live order book: top 5 bids/asks with depth visualization and spread in bps
- Market signals: TIGHT_SPREAD, HIGH_ACTIVITY, MOVING, LIQUID, NEAR_RESOLUTION, WIDE_SPREAD, LOW_VOLUME
- Order form: side YES/NO, shares, limit price
- Order summary: cost, payout if correct, return %, slippage estimate, bankroll sizing warning
- Bankroll tracking: user-set bankroll with position sizing context
- Live execution: routes to aomi Session then Para wallet signing
- Fill tracking: polls CLOB API every 3s for order status PENDING to OPEN to MATCHED to FILLED
- Wallet connect prompt inline when not connected
- Paper trade fallback when no wallet

Order flow:
1. User selects market — fetches order book + analyzes signals
2. User enters shares + limit price — calculates cost/payout/return
3. User clicks Submit — sendLiveOrder() builds EIP-712 payload
4. aomi Session routes to wallet — user signs
5. Order submitted to CLOB — pollOrderFill() tracks status every 3s
6. Trade recorded to history

---

## Services

### marketService.ts

- fetchActiveMarkets() — hits /api/markets with 2min TTL cache
- onMarketsRefresh() — subscription pattern for market updates
- initMarketService() — starts adaptive polling (15s active / 60s idle)
- Returns markets with 24h/7d/30d probability changes enriched from CLOB

### clobService.ts

- fetchOrderBook(tokenId) — fetches live order book from CLOB proxy
- fetchUserPositions(walletAddress) — fetches open positions from Gamma API
- fetchTokenPrice(tokenId) — fetches current price for a token
- Returns structured OrderBook and UserPosition[]

### edgeEngine.ts

- scoreMarket(market) — deterministic scoring 0-100
- findEdges(markets, query) — filters by category/keywords, scores, returns top 3
- explainScore(market) — generates human-readable breakdown e.g. "vol $2.3M · near 50% · +4.1pp 24h"
- Philosophy: observable signals only, no fabricated labels

### signalEngine.ts

- analyseMarket(market, orderBook) — generates honest market signals
- Signal types: TIGHT_SPREAD, HIGH_ACTIVITY, MOVING, LIQUID, NEAR_RESOLUTION, WIDE_SPREAD, LOW_VOLUME
- estimateSlippage(orderBook, side, dollarSize) — walks order book, calculates volume-weighted avg fill price
- Returns execution score 0-100 and activity score 0-100

### tradeIntentService.ts

- constructBetIntent(proposal) — builds natural-language trade intent
- sendTradeIntent(intent, options) — routes to aomi Session, paper-trade fallback if no wallet
- sendLiveOrder(params) — builds EIP-712 Polymarket order, sends via aomi Session
- Modes: PAPER_TRADE (no wallet), SIGNING_REQUIRED (wallet connected), EXECUTED (tx confirmed)

### orderFillService.ts

- pollOrderFill(orderId, onUpdate) — polls CLOB API every 3s for up to 60s
- Emits PENDING to OPEN to MATCHED to FILLED or CANCELLED/REJECTED
- Calls onUpdate callback on every poll for live UI updates

### positionGuardService.ts

- addGuard(guard) — creates stop-loss / take-profit rule
- analyseGuard(guard, currentProbability) — evaluates if rule triggered
- checkGuards(marketProbabilities) — checks all active guards, returns triggered analyses
- calculateDefaultThresholds(probability) — take-profit = min(P+10, 99), stop-loss = max(P-10, 1)
- validateGuardThresholds(stopLoss, takeProfit) — validates stop-loss < take-profit
- Actions: HOLD (no action), SELL (40% of position at take-profit), REDUCE (65% of position at stop-loss)
- Storage: localStorage, no server state

### alertService.ts

- addAlert(alert) — creates price alert above/below threshold
- checkAlerts(marketProbabilities) — evaluates all alerts, fires browser notifications
- requestNotificationPermission() — requests browser notification permission
- Storage: localStorage, 60s polling interval

### bankrollService.ts

- getBankroll() — retrieves user-set bankroll from localStorage
- getBankrollContext() — calculates total deployed, P&L, win rate, category breakdown
- getSizingContext(proposedCost) — returns % of bankroll warning if >10% or >20%

### tradeHistoryService.ts

- addTradeRecord(record) — logs every paper and live trade
- checkTradeOutcomes() — polls Gamma API for resolved markets, updates paper trade P&L
- exportTradeHistoryCSV(records) — downloads trade history as CSV
- Storage: localStorage, max 200 records

### orderBuilder.ts

- buildLimitOrder(params) — constructs EIP-712 Polymarket limit order payload
- buildOrderIntent(params) — constructs natural-language order intent string

---

## Components

### Navigation
- TopNav — fixed header with logo, nav links (AI, Trade, Markets, Portfolio, Execute), status indicators, wallet address
- MobileBottomNav — mobile-only bottom navigation with 5 tabs
- Footer — links and branding

### Trade Flow
- QueryBar — text input for natural language queries with suggestion chips
- EdgeResults — displays top 3 opportunities with scores, reasoning, and action buttons
- BetSimulation — modal for trade confirmation (paper or live) with dollar-based sizing
- PnlCard — receipt-style card showing trade details and P&L

### Market Discovery
- MarketFeed — paginated market list
- TrendingMarkets — top 10 markets by activity
- CategoryFilter — 7-category filter buttons with counts
- PriceChart — lightweight-charts integration for CLOB price history
- OrderBook — live order book visualization

### Portfolio Management
- PositionPanel — open positions table (wallet required)
- AlertsPanel — price alert manager with browser notification toggle
- PositionGuardPanel — stop-loss / take-profit rule manager with live analysis
- TradeHistory — full trade log with aggregate stats and CSV export

### AI Integration
- AomiWidget — embedded aomi-widget with custom styling
- AomiFrame — compound component (Root, Header, Composer, ControlBar)
- ThreadPersist — persists chat thread to localStorage
- RuntimeAgentBridge — bridges aomi runtime events to app state (Zustand)
- TradeCard — renders trade_card JSON from AI into interactive confirmation UI

### UI Primitives
- Button, Input, Dialog, Popover, Tooltip, Sidebar, Sheet
- EmptyState — contextual empty states for alerts, history, guards
- ErrorBoundary — catches component errors gracefully
- Skeleton — loading placeholder

---

## API Routes

### /api/aomi/[...path]

Proxy to aomi backend. On every chat POST:
- Fetches live market context (top 10 by volume, 24h/7d/30d changes, biggest movers)
- Injects user positions if wallet address provided
- Injects trade history if provided by client
- Enriches system prompt with POLYMARKET_SYSTEM_PROMPT
- Rate limited: 30 requests/min per IP
- Market context cached server-side for 5 minutes

### /api/markets

Proxy to Polymarket Gamma API with 2min TTL cache. Returns enriched market data.

### /api/markets/[id]

Single market lookup for outcome resolution.

### /api/markets/search

Market search endpoint.

### /api/clob/[...path]

Proxy to Polymarket CLOB API for order books and price history.

### /api/positions

Proxy to Gamma API for user positions (avoids CORS).

---

## Security

- Rate limiting: 30/min on aomi proxy, 60/min on markets API
- Max request body: 20k chars
- Referrer check on ?simulate= URL params (prevents cross-site trade injection)
- Para SDK handles key management — no private keys stored in app
- EIP-712 signing — user reviews transaction before confirming
- Max shares: 10,000 per trade
- Max cost: $10,000 per trade
- Bankroll sizing warnings at >10% and >20% of bankroll

---

## Data Flow

```
User query
    |
    v
/api/aomi proxy
    |-- fetches /api/markets (cached 5min)
    |-- fetches CLOB history for top 3 markets
    |-- fetches user positions from Gamma API
    |-- injects trade history from client
    |
    v
aomi backend (https://api.aomi.dev)
    |
    v
AI response (analysis or trade_card JSON)
    |
    v
TradeCard component
    |
    v
sendLiveOrder() -- builds EIP-712 payload
    |
    v
aomi Session -- routes to Para wallet
    |
    v
User signs transaction
    |
    v
CLOB order submitted
    |
    v
pollOrderFill() -- 3s polling for 60s
    |
    v
Trade recorded to localStorage
    |
    v
Position guards evaluate every 60s
    |
    v
Alerts fire on threshold cross
```

---

## PMF and Why This Matters

### The User

Active Polymarket traders. People who already know what prediction markets are, already have positions, and are frustrated by the native Polymarket UI — which is a market browser, not a trading tool. No edge detection. No AI analysis. No position guards. No order book signals. No slippage estimates.

### The Problem They Have Right Now

1. They cannot monitor 1000+ markets manually — they miss moves
2. They have no way to know if a market has good execution conditions before entering
3. They have no automated risk management — they watch positions manually
4. The AI tools they use (ChatGPT, etc.) do not have live Polymarket data

### Why This Solves It

- The edge engine surfaces the 3 best opportunities from 1000+ markets in seconds
- The signal engine tells you if the spread is too wide before you enter
- The position guard watches your positions 24/7 and alerts when thresholds cross
- The AI has live data injected — it actually knows what is happening right now
- Paper-trade mode means anyone can start immediately without a wallet

### Why Now

Polymarket volume hit $1B+ in 2024 and is growing. The 2026 midterms, Fed rate decisions, crypto price markets — there is more money and more markets than ever. But the tooling has not kept up. The traders who are winning are the ones with better information and faster execution. This is that tool.

### The Honest Gap

The position guard fires an alert but does not auto-execute yet. That is the next unlock — when the guard triggers, it routes the exit order through aomi automatically. That is the feature that makes this genuinely differentiated from anything else in the market.

---

## What Is Built vs What Is Next

### Fully Implemented

- AI chat with live market context injection
- Market discovery with edge scoring
- Paper trade simulation with dollar-based sizing
- Live order execution via wallet and aomi
- Position tracking and P&L
- Price alerts with browser notifications
- Position guards (stop-loss / take-profit rules)
- Trade history with resolved P&L and CSV export
- Bankroll tracking and sizing context
- Order book visualization with depth bars
- Market signals (spread, activity, movement, liquidity)
- Slippage estimation from order book depth
- Aggregate trade stats (win rate, total deployed, avg return)
- Responsive design (desktop multi-column + mobile tabs)
- Rate limiting, CSRF protection, security headers

### Next Opportunities

1. Auto-execute position guard exits via aomi when rules trigger
2. WebSocket price feed — replace polling with live Polymarket stream
3. Server-side edge scoring — incorporate CLOB depth and whale activity signals
4. Kalshi integration — cross-platform arbitrage detection
5. Desktop app — Tauri-based native app with system tray and push notifications
6. Onboarding flow — welcome modal + spotlight tour for first-time users

---

## Code Quality

### Strengths

- Consistent service layer abstraction
- Type-safe throughout (TypeScript)
- Deterministic algorithms (edge scoring, signal generation)
- Graceful error handling and fallbacks at every layer
- localStorage persistence with max record limits
- Responsive design (desktop and mobile)
- Error boundaries on all data panels
- Adaptive polling (15s active / 60s idle)
- 5-minute server-side market context cache

### Architecture Decisions

**Paper-trade first** — All features work without credentials. Graceful degradation: paper mode to signing required to executed.

**Server-side system prompt injection** — Backend proxy enriches every message with live market data. AI always has current context without visible message pollution in the thread.

**localStorage-based state** — No backend database required. Trades, alerts, guards, bankroll all stored locally. Scales to 200 trades per user. Survives page reloads and navigation.

**Deterministic edge scoring** — Observable signals only. No fabricated labels. Transparent breakdown shown to user.

**Honest signal engine** — Replaces old edge engine which fabricated signals. Every signal has a verifiable data source (spread bps, book depth, volume, 24h movement).

**Slippage estimation** — Walks order book, calculates volume-weighted average fill price vs best price. Shown in order form for transparency before the user commits.

---

*Last updated: April 2026*
