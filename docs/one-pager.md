# Kuroko — One Pager

**Current focus:** Agora Agents Hackathon, Arc Testnet flow
**Updated:** May 18, 2026

---

## Who this is for

Active prediction market traders managing $500–$10K in open positions. They know the markets. They have a thesis. What they don't have is the ability to watch 1,000 markets simultaneously, execute the moment a threshold hits, or sleep without worrying a position moved 15pp overnight.

This is not for casual users. It's for the trader who already has positions open and needs a system that works while they're offline.

---

## Why this changes their life

The single most painful thing in prediction market trading is not finding the trade — it's managing it after entry.

You buy YES at 44%. It runs to 68%. You're asleep. It drops back to 51%. You wake up to a missed exit.

Kuroko solves this with position guards and wallet-aware execution: automated stop-loss and take-profit rules that can route through your wallet when a threshold is crossed. Set it once. The system polls every 60 seconds, detects the trigger, and routes the exit order through aomi → Para signing → Polymarket CLOB. No manual monitoring. No missed exits.

The AI layer makes it accessible. Instead of configuring rules in a form, you type: "set a stop-loss at 30% on my Fed rate cut position." The AI creates the guard, confirms it, and the poller takes over.

That's the life-changing part: the system watches your positions while you sleep.

---

## Agora / Arc version

For the Agora Agents Hackathon, Kuroko now runs on two paths:

- **Polygon:** production Polymarket intelligence and CLOB order routing.
- **Arc Testnet:** seeded prediction markets on a deployed `ArcPredictionMarket` contract at `0x64921c648f66d9C5CeA1E36b54d9396beDaB6492`.

The Arc path is product-safe: the UI, AI context, seed script, and contract validation all share the same market registry. Real Arc transactions only happen when the selected market exists on-chain, is unresolved, and matches the shared registry. Other mirrored live markets stay simulation-only.

This lets the demo feel like the real Polymarket product while proving the on-chain Arc execution path end to end.

---

## What I'd build next

**Arc market admin flow** — Let the owner create and resolve mirrored Arc markets from a protected admin page instead of editing JSON and running scripts manually.

**Autonomous proposal queue** — The agent runs every 60s, scores all markets for correlated mispricings (same as Orca), and queues trade proposals with reasoning. You wake up to "3 proposals pending" — approve, dismiss, or set auto-execute rules. This is the bridge from AI-assisted to AI-native trading.

**Kalshi integration** — aomi has a native Kalshi app. Same agent layer, cross-platform. When the same event is priced differently on Polymarket and Kalshi, surface the gap and route the arbitrage.

**Wallet AI assistant demo** — A clean reference showing how a wallet (MetaMask, Rainbow) embeds `<AomiFrame />` to give users an AI that explains transactions before signing. This is the demo that closes aomi's wallet client pipeline.
