# Kuroko — One Pager

**Started:** Monday, April 28
**Submitted:** Friday, May 1 (Day 4)

---

## Who this is for

Active Polymarket traders managing $500–$10K in open positions. They know the markets. They have a thesis. What they don't have is the ability to watch 1,000 markets simultaneously, execute the moment a threshold hits, or sleep without worrying a position moved 15pp overnight.

This is not for casual users. It's for the trader who already has positions open and needs a system that works while they're offline.

---

## Why this changes their life

The single most painful thing in prediction market trading is not finding the trade — it's managing it after entry.

You buy YES at 44%. It runs to 68%. You're asleep. It drops back to 51%. You wake up to a missed exit.

Kuroko solves this with position guards: automated stop-loss and take-profit rules that execute through your wallet the moment a threshold is crossed. Set it once. The system polls every 60 seconds, detects the trigger, and routes the exit order through aomi → Para signing → Polymarket CLOB. No manual monitoring. No missed exits.

The AI layer makes it accessible. Instead of configuring rules in a form, you type: "set a stop-loss at 30% on my Fed rate cut position." The AI creates the guard, confirms it, and the poller takes over.

That's the life-changing part: the system watches your positions while you sleep.

---

## What I'd build next

**Autonomous proposal queue** — The agent runs every 60s, scores all markets for correlated mispricings (same as Orca), and queues trade proposals with reasoning. You wake up to "3 proposals pending" — approve, dismiss, or set auto-execute rules. This is the bridge from AI-assisted to AI-native trading.

**Kalshi integration** — aomi has a native Kalshi app. Same agent layer, cross-platform. When the same event is priced differently on Polymarket and Kalshi, surface the gap and route the arbitrage.

**Wallet AI assistant demo** — A clean reference showing how a wallet (MetaMask, Rainbow) embeds `<AomiFrame />` to give users an AI that explains transactions before signing. This is the demo that closes aomi's wallet client pipeline.
