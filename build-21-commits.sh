#!/usr/bin/env bash
# Builds 21 granular commits from scratch on an orphan branch
# by applying each commit's diff against the previous state.
# Then pushes to GitHub main.

set -e
REPO="/Users/gordianetim/Downloads/kuroko"
cd "$REPO"

# The base commit (058) — everything before our 21 commits
BASE="a6b142837"

echo "==> Creating orphan branch from commit [058]..."
git checkout --orphan granular-21
git reset --hard "$BASE"

echo "==> Applying 21 commits as individual diffs..."

COMMITS=(
  "38d564bb8:[059] Add dev:clean script to package.json"
  "e31cf0990:[060] TopNav: KUROKO white logo all screens, onManageWallet prop, clickable wallet address, mobile Connect Wallet button in hamburger"
  "5631d1796:[061] Chat page: wallet address appended as ?wallet= to backendUrl so AI proxy injects positions, onManageWallet wired"
  "4597bcc7a:[062] Trade page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled"
  "8aec981a2:[063] Markets page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect on all screens"
  "b33feb302:[064] Portfolio page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled"
  "c54c58b36:[065] Execute page: onConnectWallet + onManageWallet passed to TopNav — mobile wallet connect enabled"
  "371ba23ab:[066] Fix Para modal customPalette — correct nested object structure for text, tileButton, iconGroup, input, primaryButton"
  "101a62d55:[067] ParaBackdrop: MutationObserver + aggressive SVG icon injection — forces #f0f0f0 on all Para modal icons"
  "4ce267baa:[068] CLOB proxy: migrate to shared lib/ratelimit.ts (Upstash Redis + in-memory fallback), add 20k body size guard, strip internal URL from 502 errors"
  "10961fa4f:[069] aomi proxy: migrate to shared lib/ratelimit.ts — rate limiting now persistent across all Vercel instances when Upstash Redis is configured"
  "4b30470a6:[070] Markets API: migrate to shared lib/ratelimit.ts — removes local in-memory rate limit map"
  "5cdc43d4f:[071] docs: update changes-audit-2026-04 with fixes 36-43 — rate limit migration, TopNav, wallet injection, Para modal, dev:clean"
  "9ab3b9078:[072] TODO: mark auto-execute guards, unit tests, position guard auto-execution as completed — update open items"
  "6e0ddd60b:[073] README: update Security section with all hardening, add dev:clean to Commands, update What's Next — remove completed items, add Vercel KV"
  "60b43e6d2:[074] .env.example: add Upstash Redis and Vercel KV placeholders with setup instructions, improve all comments"
  "30702e2c3:[075] Positions API: add rate limiting via shared lib/ratelimit.ts, add ETH_ADDRESS_RE wallet validation — prevents enumeration attacks"
  "5d0b29c1e:[076] CI: add --legacy-peer-deps to npm ci, add --run flag to vitest, add npm audit vulnerability scan step"
  "be5c32e5f:[077] vercel.json: add all 9 environment variable references — PostHog, Sentry, Upstash Redis, Vercel KV"
  "ef8d5c6d8:[078] Markets search: fix checkRateLimit call to use shared lib/ratelimit.ts signature (namespace, ip, limit, windowSecs)"
  "606d90a6c:[079] CONTRIBUTING: add dev:clean command, update test count to 93 across 11 files"
)

for ENTRY in "${COMMITS[@]}"; do
  SHA="${ENTRY%%:*}"
  MSG="${ENTRY#*:}"
  echo "  Applying $SHA: ${MSG:0:60}..."
  git diff "${SHA}^" "$SHA" | git apply --index --whitespace=nowarn 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m "$MSG"
  else
    echo "    (empty diff — skipping)"
  fi
done

echo ""
COUNT=$(git log --oneline | wc -l | tr -d ' ')
echo "==> Total commits on granular-21: $COUNT"

echo ""
echo "==> Pushing to GitHub via SSH..."
git push origin granular-21:main --force

echo ""
echo "==> Switching back to main..."
git checkout main
git branch -D granular-21

echo ""
echo "==> Done!"
git fetch origin
git log --oneline origin/main | head -25
