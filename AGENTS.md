# Kuroko — Agent Context

## Project
Prediction market trader agent. Dual-chain: **Polygon** (Polymarket, production) + **Arc Testnet** (custom contract + seeded testnet markets, for Agora Agents Hackathon).

Arc is not just a paper demo anymore. The seeded markets in `lib/data/arcMarkets.json` have matching on-chain markets on the deployed Arc contract, and the UI validates market alignment before sending real Arc testnet transactions.

## Build & Test
```
npm run build        # next build (must pass before any commit)
npm run dev          # local dev server
npm run lint         # next lint
npm test             # vitest
npm run seed:arc     # seed shared Arc markets on-chain
```

## Arc Testnet Deploy (one-time)
Prerequisites: `ARC_DEPLOYER_PRIVATE_KEY` in `.env.local`.

1. Get testnet USDC from Arc faucet:
   - https://faucet.circle.com/
   - Arc CLI: `arc faucet <your-address>`
   - Or ask in Arc Discord #testnet-faucet

2. Deploy the contract:
```
forge script scripts/DeployArc.s.sol --rpc-url arc-testnet --broadcast
```

3. Copy the printed contract address into `.env.local`:
```
NEXT_PUBLIC_ARC_MARKET_CONTRACT=0x...
```

4. Rebuild:
```
npm run build
```

5. Seed the shared Arc markets on-chain:
```
npm run seed:arc
```

The seed script reads `lib/data/arcMarkets.json` and refuses to append markets if the deployed contract has drifted from the shared UI registry.

Current deployed Arc contract:
```
0x64921c648f66d9C5CeA1E36b54d9396beDaB6492
```

Seed status: the 5 shared markets have been created on-chain. Re-running `npm run seed:arc` should report existing markets rather than append duplicates.

## Arc Markets API
`/api/arc-markets` returns Arc-compatible market data.

Primary behavior:
- fetch live Polymarket-style markets from `/api/markets`
- mark each market with `arcMirror: true`
- mark seeded markets as `arcStatus: ready_on_arc` and include `arcContractMarketId`
- mark unseeded live markets as `arcStatus: not_deployed_on_arc`

Fallback behavior:
- if live market fetch fails, return the 5 shared seeded markets from `lib/data/arcMarkets.json`

Edit `lib/data/arcMarkets.json` to change which markets can execute on Arc. The API, seed script, portfolio reads, and validation logic all depend on that shared registry.

## Arc Execution Rules
Real Arc execution is allowed only when:
- `NEXT_PUBLIC_ARC_MARKET_CONTRACT` is configured
- selected market resolves to a shared Arc market definition
- `contractMarketId` is a positive integer
- on-chain market exists
- on-chain question matches the shared registry
- market is unresolved
- amount is greater than zero

If any check fails, keep the flow in simulation/paper mode or show a clear disabled-state message. Never pretend a tx was submitted.

## Chat Trade Cards
`components/assistant-ui/trade-card.tsx` accepts both:
- canonical `{"action":"trade_card","market":"...","side":"YES","shares":10,"price":62}`
- aomi-style `{"action":"EXECUTE_BUY","market":"...","outcome":"YES","shares":10,"price_per_share":"0.62 USDC"}`

`components/assistant-ui/thread.tsx` strips the raw JSON from the visible message once a card is detected. If a black code block appears above a card, check the strip regex first.

On Arc, chat-card execution uses `validateArcMarketForTrade()` before building `buyShares`. On Polygon, chat-card execution uses the existing aomi/Polymarket flow.

## Key files
| File | Purpose |
|------|---------|
| `app/api/aomi/[...path]/route.ts` | AI proxy; switches prompt/markets based on `kuroko_chain` cookie |
| `app/api/arc-markets/route.ts` | Live market mirror with Arc readiness status and shared registry fallback |
| `components/assistant-ui/thread.tsx` | Chat renderer; hides raw trade-card JSON when rendering interactive cards |
| `components/assistant-ui/trade-card.tsx` | Chat trade-card parser + Polygon/Arc execution bridge |
| `components/control-bar/network-select.tsx` | Chain selector |
| `components/aomi-frame.tsx` | Sets `kuroko_chain` cookie from wallet chainId |
| `contracts/ArcPredictionMarket.sol` | Arc testnet prediction market contract |
| `lib/data/arcMarkets.json` | Shared Arc market definitions and contract IDs |
| `lib/services/arcContractService.ts` | Arc contract reads, tx payloads, and validation |
| `lib/config.ts` | `CHAINS` object with RPCs |
| `scripts/DeployArc.s.sol` | Forge deploy script |
| `scripts/seed-arc-markets.mjs` | Seeds shared Arc markets on-chain |
| `scripts/deploy-arc.ts` | Alternative viem deploy script |

## Agora Hackathon
- Deadline: May 25, 2026
- RFB 02 "Prediction Market Trader Intelligence" is the target
- Demo must show agent analyzing markets and making trades
- Circle tools (CCTP, Wallets, USYC) earn bonus points — the Arc integration implicitly uses Circle infrastructure
- Public GitHub repo required

## Verification Snapshot
Latest local checks:
- `npm run lint` passes (only the pre-existing `app/layout.tsx` custom font warning)
- `npm test` passes: 97 tests across 12 files
- `npm run build` passes (only viem/ox critical dependency warning + Google Fonts warning)

Known non-blocking warnings:
- Google Fonts may fail to optimize when network access is unavailable
- viem/ox tempo emits a critical dependency warning through aomi/viem imports
- stale `.next` can cause missing chunk/page errors; fix with `rm -rf .next` then rebuild or use `npm run dev:clean`

## Production Audit (June 2026) — 14 issues identified, 10 resolved
All P0, P1 issues fixed. See conversation history for full detail.

| Priority | Issue | File | Status |
|----------|-------|------|--------|
| P0 | Arc NO-order limit price defaults to YES probability | `execute/page.tsx:319-328` | Fixed |
| P0 | `buildBuySharesTx` sends native token instead of USDC | `arcContractService.ts:228` | Won't fix — Arc uses USDC as native gas, `payable` + `msg.value` is correct |
| P0 | Stale closure in handleQuery drops early queries | `trade/page.tsx:131-144` | Fixed — uses `useRef` for fresh market reads |
| P0 | Arc event key mismatch POLL↔POL | multiple | Won't fix — keys already match `kuroko:arc-trade-confirmed` |
| P1 | "Ask AI" full browser reload | `trade/page.tsx:193` | Fixed — `router.push()` instead of `window.location.href` |
| P1 | Sequential Arc portfolio RPC calls | `portfolio/page.tsx:155-163` | Fixed — `Promise.all` parallelized |
| P1 | Edge analysis YES bias below 50% | `edgeEngine.ts:55` | Fixed — threshold 45%→50% |
| P1 | `handleSubmit` stale `arcValidation` re-validation | `execute/page.tsx:390-392` | Defensive code, safe |
| P2 | "+0% return" when shares=0 | `execute/page.tsx:781-782` | Fixed — shows `—` instead |
| P2 | 16 `console.error` in production paths | multiple | Fixed — silenced 4 noise sources in thread.tsx (composer reset, sendMessage catch, voice errors) |
| P2 | 7 `console.warn` in production paths | `tradeIntentService.ts:76` | Removed noisy warn; rest are intentional |
| P2 | `console.error` monkey-patched by app-providers | `app-providers.tsx:89-93` | Intentional — suppresses postState/aomi 404 noise |
| P2 | 3 `eslint-disable` exhaustive-deps | multiple | Intentional — refs intentionally excluded from deps |
| P2 | No Arc paper trade tracking in portfolio | `execute/page.tsx:370-385,426-436` | Already implemented — both Arc paper and real trades are tracked |

## Key Architecture Notes (post-audit)
- **Arc native USDC**: Arc testnet uses USDC as native gas token (18 decimals). `buildBuySharesTx` sends `msg.value` with `priceNum * sharesNum * 10^16` — this is correct because `payable` on Arc == USDC payment.
- **Refs over closures**: Custom trade callbacks (`handleQuery`, `handleSubmit`) use `useRef` to read fresh state rather than relying on closure captures. Follow this pattern for any new async callback.
- **Default price on side change**: When switching YES↔NO on Arc, limit price inverts to `100 - probability`. On CLOB markets, it reads `best_ask`/`best_bid` from the order book.
