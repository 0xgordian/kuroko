# Implementation Plan: Polymarket Position Guard

## Overview

This implementation plan breaks down the Polymarket Position Guard application into discrete, actionable coding tasks. The application is a production-grade Next.js web app that integrates live Polymarket market data, embeds aomi's AI agent widget, and implements rule-based position monitoring with trade intent submission. Each task builds incrementally toward a fully functional, deployable product.

## Tasks

- [x] 1. Next.js project setup with TypeScript and Tailwind
  - Initialize Next.js 14+ project with App Router and TypeScript
  - Install and configure Tailwind CSS 3+ with custom dark theme tokens
  - Set up ESLint and Prettier for code quality
  - Create basic project structure: `app/`, `components/`, `lib/`, `types/`
  - Configure `next.config.js` for production deployment
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Core data models and types
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define `Market`, `PositionConfig`, `AgentAnalysis`, `ConditionCheck`, `ExecutionPayload` interfaces in `types/index.ts`
    - Define `TradeIntentResponse` and service interfaces
    - Add JSDoc comments for all interfaces
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.5, 6.2_

  - [ ]* 2.2 Write property test for URL state persistence round-trip
    - **Property 4: URL State Persistence Round-Trip**
    - **Validates: Requirements 4.6**

- [ ] 3. Market service (Gamma API integration with fallback)
  - [x] 3.1 Implement MarketService with Gamma API fetching
    - Create `lib/services/marketService.ts` with `fetchActiveMarkets()` function
    - Fetch from `https://gamma-api.polymarket.com/markets?limit=25&active=true&closed=false`
    - Parse response and map to internal `Market` interface
    - Implement 60-second in-memory cache to reduce API calls
    - Add error handling with fallback to static markets
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 3.2 Create fallback market data
    - Define `FALLBACK_MARKETS` array in `lib/data/fallbackMarkets.ts` with 12 realistic markets
    - Include diverse market questions covering crypto, politics, economics
    - Ensure all required fields are present and valid
    - _Requirements: 3.4_

  - [ ]* 3.3 Write property test for market data display completeness
    - **Property 1: Market Data Display Completeness**
    - **Validates: Requirements 3.2, 3.3**

- [ ] 4. Agent analysis engine (rule-based logic)
  - [x] 4.1 Implement AgentEngine with position analysis logic
    - Create `lib/services/agentEngine.ts` with `analyzePosition()` function
    - Implement rule evaluation: SELL at take-profit (40% of shares), REDUCE at stop-loss (65% of shares), HOLD otherwise
    - Generate structured `AgentAnalysis` with headline, rationale, conditions, and execution payload
    - Add timestamp to analysis output
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.2 Implement threshold validation and default calculation
    - Create `lib/utils/validation.ts` with `validateThresholds()` function
    - Create `calculateDefaultThresholds()` function: take-profit = min(P + 10, 99), stop-loss = max(P - 10, 1)
    - Add validation for position size, take-profit, and stop-loss ranges
    - _Requirements: 4.4, 4.5_

  - [ ]* 4.3 Write property test for default threshold calculation
    - **Property 2: Default Threshold Calculation**
    - **Validates: Requirements 4.4**

  - [ ]* 4.4 Write property test for threshold validation
    - **Property 3: Threshold Validation**
    - **Validates: Requirements 4.5**

  - [ ]* 4.5 Write property test for agent recommendation logic
    - **Property 5: Agent Recommendation Logic**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 5. Trade intent service (AomiClient integration)
  - [x] 5.1 Implement TradeIntentService with AomiClient
    - Install `@aomi-labs/client` dependency
    - Create `lib/services/tradeIntentService.ts` with `sendTradeIntent()` function
    - Implement `constructIntent()` to format trade intent strings
    - Add paper-trade stub fallback when credentials not configured
    - Handle AomiClient errors gracefully
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.2 Write property test for trade intent construction
    - **Property 6: Trade Intent Construction**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. UI components (MarketSelector, PositionConfig, AgentResults, etc.)
  - [x] 7.1 Create HeroSection component
    - Build `components/HeroSection.tsx` with product name, value proposition, and CTA
    - Style with dark web3 aesthetic using Tailwind
    - Make fully responsive (mobile-first)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Create StatusIndicator and ExecutionBadge components
    - Build `components/StatusIndicator.tsx` to show "Live" or "Fallback" data mode
    - Build `components/ExecutionBadge.tsx` to show "Paper Trade" or "Live" execution mode
    - Style with clear visual distinction
    - _Requirements: 3.6, 7.5_

  - [x] 7.3 Create MarketSelector component
    - Build `components/MarketSelector.tsx` with market list display
    - Implement search/filter functionality
    - Add loading skeleton for fetch state
    - Display market question, current probability, volume
    - Highlight selected market
    - Add "Refresh Markets" button
    - _Requirements: 3.2, 3.5_

  - [x] 7.4 Create MarketDetails component
    - Build `components/MarketDetails.tsx` to display selected market info
    - Show question, current probability, volume, liquidity, end date
    - Style with clear visual hierarchy
    - _Requirements: 3.3_

  - [x] 7.5 Create PositionConfig component
    - Build `components/PositionConfig.tsx` with input fields for position size, take-profit, stop-loss
    - Implement inline validation with error messages
    - Pre-populate thresholds using `calculateDefaultThresholds()`
    - Sync values to URL query params on change
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.6 Create AgentControls component
    - Build `components/AgentControls.tsx` with "Run Agent" button
    - Disable button when no market selected or validation errors present
    - Show loading state during analysis
    - _Requirements: 5.1_

  - [x] 7.7 Create AgentResults component
    - Build `components/AgentResults.tsx` to display `AgentAnalysis` output
    - Show headline with color coding (green=profit, red=loss, blue=hold)
    - Display rationale, conditions checklist, execution payload
    - Show trade intent string and backend response
    - Display execution mode badge
    - _Requirements: 5.6, 6.4, 6.6, 6.7_

  - [x] 7.8 Create Footer component
    - Build `components/Footer.tsx` with GitHub link and product description
    - Style consistently with dark theme
    - _Requirements: 7.6_

- [ ] 8. AomiFrame widget integration
  - [x] 8.1 Create AomiWidget wrapper component
    - Install `@aomi-labs/widget-lib` dependency
    - Build `components/AomiWidget.tsx` with error boundary
    - Configure `AomiFrame` with valid backend connection
    - Position widget to not obstruct main interface (responsive)
    - Add fallback placeholder for load failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 9. Main page layout and routing
  - [x] 9.1 Create root layout
    - Build `app/layout.tsx` with global styles and metadata
    - Import Tailwind CSS
    - Set up dark theme as default
    - Add viewport meta tags for responsive design
    - _Requirements: 1.5, 7.2, 7.3_

  - [x] 9.2 Create main application page
    - Build `app/page.tsx` integrating all components
    - Implement state management with React hooks (useState, useEffect, useCallback)
    - Wire up MarketService, AgentEngine, and TradeIntentService
    - Implement URL query param sync for shareable state
    - Handle loading states and error boundaries
    - _Requirements: 1.1, 4.6, 5.1, 6.4_

- [ ] 10. Environment configuration and README
  - [x] 10.1 Create environment configuration
    - Create `.env.example` with all required environment variables
    - Document Aomi credentials and optional configuration
    - Add runtime checks with clear warnings for missing variables
    - _Requirements: 8.2, 8.3_

  - [x] 10.2 Write comprehensive README
    - Create `README.md` with setup instructions (install, env vars, dev server)
    - Document deployment to Vercel
    - Add architecture overview and feature list
    - Include links to requirements and design documents
    - Add troubleshooting section
    - _Requirements: 1.3, 1.4, 8.1, 8.5_

  - [x] 10.3 Verify deployment readiness
    - Test local development workflow (`npm install && npm run dev`)
    - Verify Vercel deployment configuration
    - Ensure no demo/take-home labels in UI
    - Confirm all requirements are met
    - _Requirements: 1.3, 1.4, 1.6, 7.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript throughout as specified in the design document
- All execution is paper-trade safe by default until Aomi credentials are configured
- Property tests validate universal correctness properties using fast-check library
- Checkpoints ensure incremental validation at key milestones
