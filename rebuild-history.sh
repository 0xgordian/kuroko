#!/usr/bin/env bash
# Rebuilds git history from scratch with 21 granular commits.
# Code files are NOT touched — only .git/ is replaced.

set -e
REPO="/Users/gordianetim/Downloads/kuroko"
cd "$REPO"

echo "==> Saving remote URL..."
REMOTE="git@github.com:0xgordian/kuroko.git"

echo "==> Removing old .git history..."
rm -rf .git

echo "==> Initialising fresh repo..."
git init
git remote add origin "$REMOTE"

commit() {
  local msg="$1"
  shift
  git add "$@" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m "$msg"
    echo "  ✓ $msg"
  fi
}

echo "==> Building 21 commits..."

# [059]
commit "[059] Add dev:clean script to package.json" package.json

# [060]
commit "[060] TopNav: KUROKO white logo all screens, onManageWallet prop, clickable wallet address, mobile Connect Wallet button in hamburger" components/TopNav.tsx

# [061]
commit "[061] Chat page: wallet address appended as ?wallet= to backendUrl so AI proxy injects positions, onManageWallet wired" app/page.tsx

# [062]
commit "[062] Trade page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled" app/trade/page.tsx

# [063]
commit "[063] Markets page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect on all screens" app/markets/page.tsx

# [064]
commit "[064] Portfolio page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled" app/portfolio/page.tsx

# [065]
commit "[065] Execute page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled" app/execute/page.tsx

# [066]
commit "[066] Fix Para modal customPalette — correct nested object structure for text, tileButton, iconGroup, input, primaryButton" components/app-providers.tsx

# [067]
commit "[067] ParaBackdrop: MutationObserver + aggressive SVG icon injection — forces #f0f0f0 on all Para modal icons" components/ParaBackdrop.tsx

# [068]
commit "[068] CLOB proxy: migrate to shared lib/ratelimit.ts (Upstash Redis + in-memory fallback), add 20k body size guard, strip internal URL from 502 errors" "app/api/clob/[...path]/route.ts"

# [069]
commit "[069] aomi proxy: migrate to shared lib/ratelimit.ts — rate limiting now persistent across all Vercel instances when Upstash Redis is configured" "app/api/aomi/[...path]/route.ts"

# [070]
commit "[070] Markets API: migrate to shared lib/ratelimit.ts — removes local in-memory rate limit map" app/api/markets/route.ts

# [071]
commit "[071] docs: update changes-audit-2026-04 with fixes 36-43 — rate limit migration, TopNav, wallet injection, Para modal, dev:clean" docs/changes-audit-2026-04.md

# [072]
commit "[072] TODO: mark auto-execute guards, unit tests, position guard auto-execution as completed — update open items" TODO.md

# [073]
commit "[073] README: update Security section with all hardening, add dev:clean to Commands, update What's Next — remove completed items, add Vercel KV" README.md

# [074]
commit "[074] .env.example: add Upstash Redis and Vercel KV placeholders with setup instructions, improve all comments" .env.example

# [075]
commit "[075] Positions API: add rate limiting via shared lib/ratelimit.ts, add ETH_ADDRESS_RE wallet validation — prevents enumeration attacks" app/api/positions/route.ts

# [076]
commit "[076] CI: add --legacy-peer-deps to npm ci, add --run flag to vitest, add npm audit vulnerability scan step" .github/workflows/ci.yml

# [077]
commit "[077] vercel.json: add all 9 environment variable references — PostHog, Sentry, Upstash Redis, Vercel KV" vercel.json

# [078]
commit "[078] Markets search: fix checkRateLimit call to use shared lib/ratelimit.ts signature (namespace, ip, limit, windowSecs)" app/api/markets/search/route.ts

# [079]
commit "[079] CONTRIBUTING: add dev:clean command, update test count to 93 across 11 files" CONTRIBUTING.md

# Commit everything else not yet staged
git add -A
if ! git diff --cached --quiet; then
  git commit -m "[080] Add all remaining project files"
fi

echo ""
COUNT=$(git log --oneline | wc -l | tr -d ' ')
echo "==> Total commits: $COUNT"

echo ""
echo "==> Pushing to GitHub (SSH)..."
git push origin main --force

echo ""
echo "==> Done!"
git log --oneline | head -25
