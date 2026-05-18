# Contributing to Kuroko

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/kuroko
cd kuroko
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

The app runs fully in paper-trade mode without any API keys.

## Commands

```bash
npm run dev          # Development server (http://localhost:3000)
npm run dev:clean    # Clear .next cache then start (use after significant changes)
npm run build        # Production build
npm run lint         # ESLint + TypeScript check
npm test             # Vitest unit tests (97 tests across 12 files)
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Coverage report
npm run seed:arc     # Seed shared Arc markets on Arc testnet
```

## Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- Prettier config in `.prettierrc` — run `npx prettier --write .` before committing
- ESLint config in `.eslintrc.json` — `npm run lint` must pass

## Design System

All UI changes must follow the design system in `docs/ui-ux-design-system.md`:

- Cards and controls use restrained 8-12px radius unless an existing component requires otherwise
- Only colors from the defined palette — no random Tailwind default color classes
- `#7c3aed` brand purple and Arc blue are the current product accents
- `panel-bracket` is the standard panel surface
- Mono font for all labels, numbers, badges

## Architecture

- **Services** (`lib/services/`) — pure business logic, no React, no side effects at import time
- **Components** (`components/`) — React only, import services, never call APIs directly
- **API routes** (`app/api/`) — server-side proxies, rate limiting, no business logic
- **Stores** (`lib/stores/`) — Zustand global state, minimal surface area

## Testing

- Unit tests live in `lib/services/__tests__/` and `app/api/*/route.test.ts`
- Use Vitest + `@testing-library/react` for component tests
- `fast-check` is available for property-based tests
- New services should have unit tests covering the main happy path and error cases

## Environment Variables

See `.env.example` for all available variables. The app works without any keys in paper-trade mode.

Required for live trading:
- `NEXT_PUBLIC_AOMI_API_KEY` — aomi backend
- `NEXT_PUBLIC_PARA_API_KEY` — Para wallet connect

Required for Arc execution:
- `NEXT_PUBLIC_ARC_MARKET_CONTRACT` — deployed `ArcPredictionMarket` address
- `ARC_DEPLOYER_PRIVATE_KEY` — only for deploy/seed scripts, never expose client-side

Optional observability:
- `NEXT_PUBLIC_SENTRY_DSN` — error tracking (Sentry)
- `NEXT_PUBLIC_POSTHOG_KEY` — analytics (PostHog)

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- `npm run lint` and `npm test` must pass
- `npm run build` must pass before merge
- `forge build` must pass when contracts or forge scripts change
- Update `TODO.md` if completing an open task
- Add a brief description of what changed and why

## Arc Rules

- Keep Polygon/Polymarket behavior working.
- Use the `kuroko_chain` cookie for chain context, not query params.
- Do not send a real Arc tx unless `validateArcMarketForTrade()` passes.
- Add executable Arc markets to `lib/data/arcMarkets.json`, then run `npm run seed:arc`.
- Treat unseeded live Polymarket mirror markets as simulation-only on Arc.
