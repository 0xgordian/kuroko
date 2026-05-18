# Kuroko

> An AI hybrid trading platform for prediction markets — built on `@aomi-labs/client`, `@aomi-labs/widget-lib`, and Para SDK. The AI watches your positions while you sleep.

- **[Live Website](https://kurokodev.vercel.app)**
- **[Read Documentation](https://0x-250ca30e.mintlify.app/introduction)**

---

![Kuroko — AI Market Intelligence](public/hero.png)

---

## What This Is

Polymarket traders miss moves because they can't watch 1,000 markets simultaneously. Kuroko fixes that.

It's a full-stack AI-native trading platform: live market data injected into every AI message, edge scoring across all active markets, and position guards that auto-execute stop-loss and take-profit rules through your wallet while you're offline. Supports **Polygon (Polymarket)** and **Arc Testnet** with on-chain prediction markets.

The AI has live market data on every message — current probabilities, 24h/7d/30d price changes, volume, liquidity, Arc execution status, and your open positions. It surfaces opportunities, explains the thesis, and routes a trade to your wallet without leaving the chat.

**Position guards:** set a stop-loss once. The system polls every 60 seconds and executes the exit order through aomi → Para signing → Polymarket CLOB when your threshold hits. No manual monitoring. No missed exits.

> Paper trade mode works fully out of the box — no API keys, no wallet required. Markets load live from Polymarket's public API.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | AI chat with live market context |
| `/trade` | Market dashboard + edge scoring + bet simulation |
| `/markets` | Full market browser with search, filters, and alerts |
| `/portfolio` | Positions, P&L, alerts, position guards, trade history |
| `/execute` | Direct order terminal with live order book and fill tracking |

---

## Setup

```bash
git clone https://github.com/0xgordian/kuroko
cd kuroko
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Enable AI + Wallet

```env
# .env.local

# aomi backend — enables AI chat with live market context
NEXT_PUBLIC_AOMI_API_KEY=your_key_here

# Para SDK — enables wallet connect (Google, Twitter, Discord, email)
NEXT_PUBLIC_PARA_API_KEY=your_key_here
```

Get an aomi key at [aomi.dev](https://aomi.dev). The app works without it using the default aomi app.

---

## How aomi Powers This

Kuroko is built on three aomi primitives:

### `@aomi-labs/widget-lib` — `<AomiFrame />`

The entire AI chat interface. Drop-in React component with wallet awareness built in. Kuroko wraps it with a custom `Thread` component, custom markdown rendering, and a `trade_card` JSON → interactive UI bridge.

```tsx
// Zero-config embed
<AomiFrame backendUrl="/api/aomi" walletAddress={address} />
```

### `@aomi-labs/client` — `Session`

The TypeScript SDK for programmatic trade intent routing. When a user confirms a trade, `sendLiveOrder` builds an EIP-712 Polymarket order and routes it through an aomi `Session` to the connected wallet for signing.

```typescript
const session = new Session(
  { baseUrl: AOMI_BASE_URL, apiKey: AOMI_API_KEY },
  { app: AOMI_APP_ID, publicKey: walletAddress, userState: { chainId: 137 } }
);

// Handle on-chain transaction requests
session.on("wallet_tx_request", async (req) => {
  const txHash = await walletClient.sendTransaction(req.payload);
  await session.resolve(req.id, { txHash });
});

// Handle EIP-712 payloads (Polymarket CLOB orders)
session.on("wallet_eip712_request", async (req) => {
  const signature = await wallet.signTypedData(req.payload);
  await session.resolve(req.id, { signature });
});

const result = await session.send(fullMessage); // natural-language trade intent
```

### System Prompt Injection

Every chat message is enriched server-side with live Polymarket market data (top 10 by volume, 24h/7d/30d changes, biggest movers) and the user's open positions before hitting the AI. The agent reasons with real numbers, not stale context.

### Trade Card Flow

The AI returns structured JSON at the end of a trade recommendation:

```json
{
  "action": "trade_card",
  "market": "Will the Fed cut rates in June 2026?",
  "side": "YES",
  "shares": 50,
  "price": 44,
  "reasoning": "Fed futures pricing 68% cut probability vs 44% on Polymarket"
}
```

`parseTradeCard()` detects this, strips the raw JSON from the visible chat text, renders a `TradeCard` component inline, and the user confirms. The parser accepts the canonical `trade_card` format and the aomi-style `EXECUTE_BUY` format so the chat does not degrade into a copy-only code block.

On Polygon, confirmation triggers `addTradeRecord` + `sendLiveOrder` when a wallet is connected. On Arc, confirmation validates the market against the deployed `ArcPredictionMarket` contract before building a real `buyShares` transaction. The result is shared back to the thread via `shareToChat`.

### Para SDK

Social login (Google, Twitter, Discord, email) → non-custodial wallet on Polygon. No seed phrase. No private key management. Para handles all signing — Kuroko never touches a private key.

### Supported Chains

Kuroko supports **Polygon (137)** for Polymarket and **Arc Testnet (5042002)** with on-chain prediction markets. More networks being added.

### Arc Testnet Flow

On Arc, Kuroko connects to a deployed `ArcPredictionMarket` contract. The app can show live Polymarket-style market data through `/api/arc-markets`, then marks each market as either `ready_on_arc` or `not_deployed_on_arc`.

The five seeded Arc markets are backed by the shared registry in `lib/data/arcMarkets.json`. Those markets can execute real Arc testnet transactions. Other mirrored live markets remain simulation-only until they are added to the shared registry and seeded on-chain.

When you switch to Arc and place a trade:

1. You select a market and choose YES/NO + shares + price
2. Kuroko validates that the market maps to an existing unresolved on-chain market
3. Kuroko builds a `buyShares(marketId, side)` transaction
4. Para opens your wallet to review and sign
5. The transaction sends USDC (native gas on Arc) to the contract
6. Your position appears in Portfolio, read live from the chain

Seed the shared markets after deployment:

```bash
npm run seed:arc
```

The seed script refuses to append markets if the deployed contract has drifted from the shared registry, because UI market IDs and contract market IDs must stay aligned.

On Polygon, trades route through aomi → Para → Polymarket CLOB. On Arc, trades go directly to the on-chain contract. Paper trading works on both chains without a wallet connected.

### Arc Guardrails

Real Arc execution is only enabled when all checks pass:
- `NEXT_PUBLIC_ARC_MARKET_CONTRACT` is configured
- the selected UI market maps to a numeric `contractMarketId`
- the on-chain market exists
- the on-chain question matches the shared registry
- the market is unresolved
- trade amount is greater than zero

If any check fails, Kuroko leaves the market in simulation/paper mode and shows a clear message instead of pretending a wallet transaction was submitted.

### Arc Contract

Deployed at `0x64921c648f66d9C5CeA1E36b54d9396beDaB6492` on Arc Testnet. Features:
- `createMarket(question, resolutionTime)` — create a new prediction market
- `buyShares(marketId, side)` — buy YES or NO shares (payable in USDC)
- `resolveMarket(marketId, outcome)` — owner resolves the market
- `claimPayout(marketId)` — claim winnings after resolution

---

## Architecture

```
app/
  page.tsx                    # AI chat — AomiFrame + AutoSendBridge
  trade/page.tsx              # Markets dashboard + edge engine
  markets/page.tsx            # Full market browser
  portfolio/page.tsx          # Positions + P&L + alerts + guards
  execute/page.tsx            # Order terminal + fill tracking
  api/aomi/[...path]/         # aomi proxy — injects live market context
  api/markets/                # Gamma API cache (2min TTL) + CLOB enrichment
  api/arc-markets/            # Live market mirror + Arc execution status
  api/clob/[...path]/         # CLOB proxy for order books
  api/positions/              # Positions proxy (CORS-safe)

components/
  assistant-ui/thread.tsx     # Custom aomi thread — dark terminal theme
  assistant-ui/trade-card.tsx # trade_card JSON → inline confirmation flow
  EdgeResults.tsx             # Scored opportunity cards with breakdown
  BetSimulation.tsx           # Trade modal — paper or live via sendLiveOrder
  PositionGuardPanel.tsx      # Stop-loss / take-profit rule manager
  TradeHistory.tsx            # Trade log with aggregate stats + CSV export
  AlertsPanel.tsx             # Price alerts + browser notifications
  CategoryFilter.tsx          # Elections/Crypto/Sports/Economics/Tech/World
  MobileBottomNav.tsx         # Mobile navigation (5 tabs)

lib/
  data/arcMarkets.json             # Shared seeded Arc market registry
  services/edgeEngine.ts           # Deterministic scoring (volume/liquidity/uncertainty/movement)
  services/arcContractService.ts   # Arc reads, validation, tx payloads, confirmations
  services/signalEngine.ts         # Honest market signals from order book data
  services/tradeIntentService.ts   # aomi Session → EIP-712 → wallet signing
  services/orderFillService.ts     # CLOB fill polling (3s interval, 60s max)
  services/positionGuardService.ts # Stop-loss / take-profit automation
  services/tradeHistoryService.ts  # localStorage + outcome resolution
  services/alertService.ts         # Price alerts + browser notifications
  services/bankrollService.ts      # Bankroll tracking + sizing context
  stores/appStore.ts               # Zustand — shareToChat, dispatchTool, simulation state
```

---

## Key Features

### AI Chat (`/`)
- Natural language queries with live market data in every response
- AI knows current probabilities, 24h/7d/30d changes, your open positions
- `trade_card` JSON → interactive confirmation card inline in chat
- Paper trade or live execution without leaving the thread
- Arc-aware prompt injection via `kuroko_chain` cookie, including wallet/session context and Arc execution status
- Raw trade-card JSON is hidden once converted into the interactive card
- Thread persistence across navigation

### Trade Dashboard (`/trade`)
- 1000+ live markets refreshed every 15s (active) / 60s (idle)
- Edge engine scores markets 0–100 on volume, liquidity, uncertainty, 24h movement
- Category filters: Elections, Crypto, Sports, Economics, Tech, World
- Simulate Bet fetches real CLOB best-ask price before opening the modal
- AI widget embedded in the right column

### Markets (`/markets`)
- Full market browser with search, probability range, volume filter, 7 sort options
- Set price alerts on any market
- Category filter with counts

### Portfolio (`/portfolio`)
- Open positions from Polymarket Gamma API (wallet required)
- Price charts via lightweight-charts + CLOB history
- Trade history with resolved P&L, win rate, avg return, CSV export
- Price alerts with browser notifications (60s polling)
- Position guards: automated stop-loss and take-profit rules

### Execute (`/execute`)
- Live order book with depth visualization and spread in bps
- Market signals: TIGHT_SPREAD, HIGH_ACTIVITY, MOVING, LIQUID, NEAR_RESOLUTION, WIDE_SPREAD, LOW_VOLUME
- Slippage estimation from order book depth
- Bankroll sizing warnings
- Fill tracking: PENDING → OPEN → MATCHED → FILLED (3s polling)
- Arc mode: validates on-chain market state, disables unsafe real txs, submits `buyShares`, waits for confirmation, and links to the Arc explorer

---

## Security

- Rate limiting: 30/min (aomi proxy), 60/min (markets, CLOB, search, positions) — persistent via Upstash Redis when configured
- SSRF protection: UPSTREAM_BASE_URL validated against ALLOWED_HOSTS allowlist
- Wallet address validation: ETH_ADDRESS_RE regex prevents prompt injection via wallet param
- CSRF: referrer check on URL params for trade simulation
- Security headers: X-Frame-Options DENY, CSP, X-Content-Type-Options, Referrer-Policy
- Max request body: 20k chars on all proxies
- Trade limits: 10k shares / $10k per simulation
- No private keys stored — Para SDK handles all signing
- positionCache capped at 500 entries with LRU eviction
- Search query sanitized: strips `&=?#%` chars, capped at 200 chars

---

## Commands

```bash
npm run dev          # Development server
npm run dev:clean    # Clear .next cache then start (use after significant changes)
npm run build        # Production build
npm run lint         # TypeScript + ESLint
npm test             # Unit tests (Vitest) — 97 tests across 12 files
npm run test:coverage # Coverage report
npm run seed:arc     # Seed shared Arc markets on-chain
```

---

## Roadmap

### Short-term
- **Autonomous proposal queue** — agent runs every 60s, scores all markets for correlated mispricings, queues trade proposals with reasoning. Approve, dismiss, or set auto-execute rules.
- **Kalshi integration** — same agent layer, cross-platform. Surface pricing gaps between Polymarket and Kalshi and route the arbitrage.
- **More chains** — Arbitrum, Base, and Optimism for Polymarket CLOB access.

### Longer-term
- **Wallet AI assistant** — embed `<AomiFrame />` in any wallet. User types "what does this contract do?" — agent simulates the transaction, shows exact token changes and gas costs, lets the user sign or reject with full context. No more blind signing.
- **GameFi** — in-game asset trading, tournament prize pools, NFT marketplace execution — all via natural language through `<AomiFrame />`.
- **DeFi momentum bot** — momentum rotation between risk and stable assets using moving-average signals, extended with Kuroko's edge scoring. No custody, no API-key juggling.

---

## Distribution

X thread: [`docs/thread.md`](docs/thread.md) · One-pager: [`docs/one-pager.md`](docs/one-pager.md)

---

## License

MIT

---

## Documentation

| File | Contents |
|---|---|
| [`docs/product-review.md`](docs/product-review.md) | Full A-Z product review — pages, services, PMF |
| [`docs/ui-ux-design-system.md`](docs/ui-ux-design-system.md) | Design system — colors, typography, layout rules |
| [`docs/fixes-summary.md`](docs/fixes-summary.md) | Complete log of all bugs fixed |
| [`TODO.md`](TODO.md) | Task tracker — completed and open items |
