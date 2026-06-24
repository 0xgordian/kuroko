# Kuroko E2E Test Plan

## Prerequisites
- `npm run dev` running locally or deployed on Vercel
- MetaMask / Para wallet installed and configured for:
  - **Polygon** (Chain ID 137)
  - **Arc Testnet** (Chain ID 5042002, RPC: https://rpc.testnet.arc.network)

---

## 1. Wallet Connection

- [ ] **1a.** Load the app → network selector shows Polygon (default)
- [ ] **1b.** Click "Connect Wallet" → MetaMask/Para prompt appears
- [ ] **1c.** Approve connection → wallet address appears in TopNav
- [ ] **1d.** Switch to Arc Testnet in wallet → network selector reflects Arc
- [ ] **1e.** Switch back to Polygon → selector reflects Polygon

## 2. Market Browser (`/markets`)

- [ ] **2a.** Navigate to `/markets` → market cards load with live data
- [ ] **2b.** Cards show: question, probability, 24h change, volume
- [ ] **2c.** Click a card → navigates to `/execute?market=X`

## 3. Edge Analysis & AI Chat (`/trade`)

- [ ] **3a.** Navigate to `/trade` → market feed loads
- [ ] **3b.** Type in the query bar → edge results appear after ~400ms
- [ ] **3c.** Click "Simulate" on an edge opportunity → bet simulation panel opens
- [ ] **3d.** Click "Ask AI" → navigates to `/` with pre-filled chat
- [ ] **3e.** On `/chat`, type "Find me the best trade" → AI streams response
- [ ] **3f.** AI response includes a trade card → card is interactive
- [ ] **3g.** Click "Execute Trade" on card → confirm step → "Confirm & Sign"

## 4. Execute Page (`/execute`)

- [ ] **4a.** Navigate to `/execute` → market selector works
- [ ] **4b.** Select a market → order book loads (Polygon) or probability shown (Arc)
- [ ] **4c.** Switch YES↔NO side → limit price inverts correctly
- [ ] **4d.** Enter shares + price → cost/payout/return display correctly
- [ ] **4e.** Return display shows "—" when shares=0, "+X%" when positive

### Polygon CLOB

- [ ] **4f.** With wallet connected on Polygon, click "Submit Order" → aomi signing flow
- [ ] **4g.** Sign in wallet → order submitted, fill tracking begins

### Arc Testnet

- [ ] **4h.** Switch to Arc, select a seeded market → validation passes
- [ ] **4i.** Wallet connected → "Ready for real Arc transaction" message
- [ ] **4j.** Click Submit → wallet prompts USDC tx → confirm
- [ ] **4k.** Transaction confirmed → portfolio refreshes

### Paper Trade

- [ ] **4l.** Without wallet connected → "Paper trade recorded" toast
- [ ] **4m.** Trade appears in Portfolio Trade History

## 5. Portfolio (`/portfolio`)

- [ ] **5a.** Navigate to `/portfolio` → Polygon positions load (if any)
- [ ] **5b.** Arc tab → on-chain positions load (from contract read)
- [ ] **5c.** Arc resolved position → "Claim" button visible
- [ ] **5d.** Click "Claim" → wallet prompts tx → payout received
- [ ] **5e.** Trade History tab shows paper + live trades
- [ ] **5f.** Alerts tab → create an alert → triggers toast + browser notification

## 6. Onboarding & UX

- [ ] **6a.** First-time user → OnboardingModal triggers after first AI response
- [ ] **6b.** Chat typing indicator shows during AI response
- [ ] **6c.** Streaming text doesn't disappear when trade card renders
- [ ] **6d.** Voice input button works (browser Speech API)
- [ ] **6e.** Slash commands (`/trade`, `/edge`, `/movers`) populate suggestions

---

## Known Gaps (not tested here)
- Arc `claimPayout` with actual testnet USDC balance
- CLOB limit order cancellation (not implemented)
- Multi-branch thread navigation
- Mobile responsive layout
