# X Thread — Kuroko

---

**Post 1 (hook)**

Polymarket traders are leaving money on the table every day.

Not because they're bad at trading. Because they can't watch 1,000 markets at once.

I built an AI that can. Here's what happened.

---

**Post 2 (the pain)**

The pattern I kept seeing:

Buy YES at 44%. Market runs to 68%. You're asleep. It drops back to 51%.

You wake up to a missed exit.

Or worse — you're watching 20 tabs, doing mental math, and still miss the move because someone else's bot was faster.

The edge in prediction markets belongs to whoever processes signals faster. Not whoever clicks first.

---

**Post 3 (the product)**

So I built Kuroko — an AI trading companion for Polymarket.

You type what you want. It watches the markets, finds the edge, and proposes the exact trade with full reasoning.

But the part that actually changes how you trade: position guards.

Set a stop-loss once. Take-profit once. The system executes automatically when your threshold hits — through your wallet, while you sleep.

---

**Post 4 (how it works)**

Under the hood:

- AomiFrame widget handles the AI chat interface
- Every message gets live Polymarket data injected server-side (prices, volume, your positions)
- The AI returns structured trade_card JSON — rendered as an interactive confirmation card
- aomi Session routes the signed EIP-712 order to Polymarket's CLOB
- Position guards poll every 60s and auto-execute via Para wallet signing

The agent layer reasons. The execution layer acts. That separation is what makes it reliable.

---

**Post 5 (the life-changing part)**

The position guard flow:

```
You: "set a stop-loss at 30% on my Fed rate cut position"
AI: creates the guard, confirms
System: polls every 60s
Trigger: probability drops to 30%
Action: exit order signed and submitted
You: wake up to a notification, not a loss
```

I sleep now. The system watches for me.

---

**Post 6 (the aomi angle)**

This is what AI x onchain actually looks like.

Not a chatbot that talks about trading. An agent that finds the trade, explains why, prepares the transaction, and executes when you're offline.

Built on @aomi_labs — the AI execution layer that makes this possible without writing a custom agent from scratch.

The SDK handles the hard parts: session management, trade intent routing, wallet signing. I focused on the product.

---

**Post 7 (call to action)**

Paper trade works out of the box. No wallet needed.

Connect a wallet to go live on Polygon.

Repo: github.com/0xgordian/kuroko

What would you build on top of this?
