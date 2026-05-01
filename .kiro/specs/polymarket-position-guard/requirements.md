# Requirements Document

## Introduction

Polymarket Position Guard is a production Next.js web application for active Polymarket traders who cannot monitor positions around the clock. It embeds aomi's real tooling (`@aomi-labs/widget-lib` AomiFrame widget and `@aomi-labs/client` session client), loads live markets from Polymarket's public Gamma API, lets traders define take-profit and stop-loss rules per position, and uses the aomi client to send natural-language trade intents to the aomi backend. The app is publicly deployed, usable by real traders, and built to be shared and distributed. All execution is paper-trade safe by default, with a clear path to live wallet execution once credentials are connected.

## Glossary

- **App**: The Next.js Polymarket Position Guard web application.
- **AomiFrame**: The React component from `@aomi-labs/widget-lib` that renders the embedded aomi AI agent widget.
- **AomiClient**: The session client from `@aomi-labs/client` used to send natural-language trade intents to the aomi backend.
- **Gamma_API**: Polymarket's public REST API at `https://gamma-api.polymarket.com` used for live market discovery.
- **Market**: A single active Polymarket prediction-market question returned by the Gamma API.
- **Position**: A trader's holding in a Market, described by entry price, current price, and share count.
- **TradeIntent**: A natural-language string sent to the aomi backend describing a desired trade action (e.g. "Sell 40 YES shares on [market] at 74 cents").
- **PaperTrade**: Execution mode where trade intents are submitted to the aomi backend and the response is displayed, but no real funds are moved. This is the default safe mode.
- **TakeProfit**: A probability threshold above which the agent recommends selling a portion of the position to lock in gains.
- **StopLoss**: A probability threshold below which the agent recommends reducing the position to limit losses.
- **AgentAnalysis**: The structured reasoning output produced after evaluating a position against the trader's rules.
- **FallbackScenarios**: Hard-coded markets used when the Gamma API is unavailable, so the app always works.
- **Trader**: An active Polymarket user who holds one or more positions and wants automated rule-based monitoring.

---

## Requirements

### Requirement 1: Next.js Application Shell

**User Story:** As a Trader, I want a fast, modern web app that works reliably, so that I can use it as part of my real trading workflow.

#### Acceptance Criteria

1. THE App SHALL be implemented as a Next.js 14+ application using the App Router.
2. THE App SHALL use TypeScript throughout.
3. THE App SHALL be runnable locally with `npm install && npm run dev` in under 5 minutes from a fresh clone.
4. THE App SHALL be deployable to Vercel with zero additional configuration.
5. WHEN the App is opened in a browser, THE App SHALL render a fully styled page without a flash of unstyled content.
6. THE App SHALL have a publicly accessible deployed URL so real users can access it without cloning the repo.

---

### Requirement 2: AomiFrame Widget Integration

**User Story:** As a Trader, I want an embedded AI assistant I can talk to about my positions, so that I can get intelligent guidance beyond the rule-based analysis.

#### Acceptance Criteria

1. THE App SHALL install and import `@aomi-labs/widget-lib` as a dependency.
2. THE App SHALL render an `AomiFrame` component visible on the main page as a persistent AI assistant panel.
3. WHEN the AomiFrame component is rendered, THE App SHALL pass a valid configuration that connects it to the aomi backend.
4. IF `@aomi-labs/widget-lib` fails to load, THEN THE App SHALL display a clearly labelled placeholder so the rest of the UI remains fully functional.
5. THE AomiFrame SHALL be positioned so it does not obstruct the main trading interface on desktop or mobile.

---

### Requirement 3: Live Market Discovery via Gamma API

**User Story:** As a Trader, I want to see real active Polymarket markets updated in real time, so that I can monitor my actual positions.

#### Acceptance Criteria

1. WHEN the App loads, THE App SHALL fetch active markets from `https://gamma-api.polymarket.com/markets?limit=25&active=true&closed=false`.
2. WHEN the Gamma API returns a valid response, THE App SHALL display up to 12 markets in a selectable list, ordered by volume descending.
3. WHEN a market is selected, THE App SHALL display the market question, current YES probability, volume, liquidity, and end date.
4. IF the Gamma API request fails or returns an empty list, THEN THE App SHALL fall back to FallbackScenarios and display a status message indicating fallback mode.
5. THE App SHALL expose a "Refresh Markets" control that re-fetches the market list on demand.
6. WHEN live data is active, THE App SHALL display a "Live" indicator; WHEN fallback data is active, THE App SHALL display a "Fallback" indicator.

---

### Requirement 4: Position and Rule Configuration

**User Story:** As a Trader, I want to define my position size and risk rules, so that the agent evaluates my specific situation accurately.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input for position size (YES shares, minimum 1).
2. THE App SHALL provide a numeric input for TakeProfit threshold (integer percentage, 1–99).
3. THE App SHALL provide a numeric input for StopLoss threshold (integer percentage, 1–99).
4. WHEN a market is selected, THE App SHALL pre-populate TakeProfit and StopLoss with sensible defaults derived from the market's current probability.
5. IF the Trader sets StopLoss greater than or equal to TakeProfit, THEN THE App SHALL display a validation error and prevent the agent from running.
6. THE App SHALL persist the selected market, TakeProfit, StopLoss, and position size in the URL query string so the state survives a page refresh and can be shared via link.

---

### Requirement 5: Agent Analysis Engine

**User Story:** As a Trader, I want the agent to evaluate my position against my rules instantly, so that I know exactly what action to take right now.

#### Acceptance Criteria

1. WHEN the Trader clicks "Run Agent", THE App SHALL evaluate the selected Market's current probability against the configured TakeProfit and StopLoss thresholds.
2. WHEN the current probability is at or above TakeProfit, THE App SHALL produce an AgentAnalysis recommending selling approximately 40% of the position.
3. WHEN the current probability is at or below StopLoss, THE App SHALL produce an AgentAnalysis recommending selling approximately 65% of the position.
4. WHEN the current probability is between StopLoss and TakeProfit, THE App SHALL produce an AgentAnalysis recommending holding the position.
5. THE AgentAnalysis SHALL include a headline, a plain-English rationale, a bullet list of checked conditions, and a structured execution payload (action type, share count, reference price, mode).
6. THE App SHALL display the AgentAnalysis in a dedicated results panel immediately after the agent runs.

---

### Requirement 6: Natural-Language Trade Intent via AomiClient

**User Story:** As a Trader, I want the agent to communicate my trade intent to the aomi backend in plain English, so that the execution layer understands exactly what I want to do.

#### Acceptance Criteria

1. THE App SHALL install and import `@aomi-labs/client` as a dependency.
2. WHEN the AgentAnalysis recommends a SELL or REDUCE action, THE App SHALL construct a TradeIntent string in the form "Sell [N] YES shares on [market question] at [price] cents".
3. WHEN the AgentAnalysis recommends a HOLD action, THE App SHALL construct a TradeIntent string in the form "Hold position on [market question] — no rule triggered".
4. WHEN a TradeIntent is constructed, THE App SHALL send it to the aomi backend via AomiClient and display the backend response.
5. IF AomiClient credentials are not configured, THEN THE App SHALL fall back to a paper-trade stub response and clearly indicate the execution is simulated.
6. IF AomiClient returns an error, THEN THE App SHALL display the error message in the results panel without crashing.
7. THE App SHALL clearly label the execution mode — "Paper Trade" when simulated, "Live" when connected to a funded wallet.

---

### Requirement 7: Polished Production UI

**User Story:** As a Trader visiting the app for the first time, I want to immediately understand what it does and trust it, so that I start using it as part of my workflow.

#### Acceptance Criteria

1. THE App SHALL display a hero section with the product name, a one-sentence value proposition, and a clear call-to-action.
2. THE App SHALL use a dark, high-contrast visual design consistent with professional web3 trading tools.
3. THE App SHALL be fully responsive and usable on screens 375px wide and above.
4. THE App SHALL NOT contain any labels identifying it as a "demo" or "take-home" — it should present as a real product.
5. THE App SHALL display the execution mode badge ("Paper Trade" or "Live") prominently on the execution panel.
6. THE App SHALL include a footer with a link to the public GitHub repository and a brief product description.

---

### Requirement 8: Developer Experience and Documentation

**User Story:** As a developer cloning the repo, I want to get the app running in under 5 minutes, so that I can contribute or self-host without friction.

#### Acceptance Criteria

1. THE App SHALL include a `README.md` with setup instructions covering `npm install`, environment variable configuration, and `npm run dev`.
2. THE App SHALL document all required environment variables in a `.env.example` file.
3. IF a required environment variable is missing at runtime, THEN THE App SHALL log a clear warning and fall back to paper-trade mode rather than crashing.
4. THE App SHALL include `docs/thread.md` containing the X thread and `docs/one-pager.md` containing the one-pager.
5. THE App SHALL be structured so that a developer familiar with Next.js can understand the full codebase within 10 minutes.
