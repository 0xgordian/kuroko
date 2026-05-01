# X Thread

1. I gave an AI agent access to Polymarket. It found a 60% vs 45% implied probability gap in 3 seconds. Here's what I built.

2. The problem: active Polymarket traders manually refresh 20 tabs, do mental math on implied probabilities, and still miss moves. The edge belongs to whoever processes signals faster — not whoever clicks first.

3. So I built Kuroko: an AI agent that watches live markets, spots where the crowd is mispricing, and surfaces the exact trade you should consider — with full reasoning and a simulation before you sign anything.

4. How it works:
- type what you're looking for in plain English
- the agent scans live Polymarket markets via their public API
- ranks opportunities by edge score (volume, liquidity, probability movement)
- proposes a specific bet with entry price, size, and expected return
- simulation shows exactly what you're signing before it executes

5. Under the hood I used @aomi_labs to wire the whole thing:
- AomiFrame widget for the embedded AI assistant
- @aomi-labs/client to send natural-language trade intents to the aomi backend
- aomi-skills for the agent workflow
The agent layer handles reasoning. The execution layer handles the trade.

6. That separation matters. In trading flows you don't want the model improvising every step. You want structured primitives the agent can reliably use — and aomi gives you exactly that.

7. The demo runs in paper-trade mode by default. No real funds. But the execution layer is structured so it upgrades to live wallet signing with one config change.

8. This is what AI x onchain actually looks like. Not a chatbot that talks about trading. An agent that finds the trade, explains why, and prepares the exact transaction for you to sign.

9. Repo: [link] · Live demo: [link]
