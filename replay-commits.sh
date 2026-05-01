#!/usr/bin/env bash
# Replays the 21 granular commits (059-079) on top of the current GitHub state
# by creating a new orphan branch from the existing GitHub content, then
# cherry-picking each commit in order.

set -e
REPO="/Users/gordianetim/Downloads/kuroko"
cd "$REPO"

echo "==> Fetching current GitHub state..."
git fetch origin

echo "==> Creating replay branch from current GitHub main..."
git checkout --orphan replay-21
git reset --hard origin/main

echo "==> Replaying 21 commits in order..."

# List of commits oldest-first (059 → 079)
COMMITS=(
  "38d564bb8"
  "e31cf0990"
  "5631d1796"
  "4597bcc7a"
  "8aec981a2"
  "b33feb302"
  "c54c58b36"
  "371ba23ab"
  "101a62d55"
  "4ce267baa"
  "10961fa4f"
  "4b30470a6"
  "5cdc43d4f"
  "9ab3b9078"
  "6e0ddd60b"
  "60b43e6d2"
  "30702e2c3"
  "5d0b29c1e"
  "be5c32e5f"
  "ef8d5c6d8"
  "606d90a6c"
)

for SHA in "${COMMITS[@]}"; do
  MSG=$(git log --format="%s" -1 "$SHA")
  echo "  Applying: $MSG"
  git cherry-pick "$SHA" --allow-empty --no-commit 2>/dev/null || true
  # Check if anything changed
  if ! git diff --cached --quiet; then
    git commit -m "$MSG"
  else
    echo "    (no changes — skipping)"
  fi
done

echo ""
echo "==> Commit count on replay-21:"
git log --oneline | wc -l | tr -d ' '

echo ""
echo "==> Pushing to GitHub..."
git push origin replay-21:main --force

echo ""
echo "==> Switching back to main..."
git checkout main
git branch -D replay-21

echo ""
echo "==> Done! GitHub now has granular commits."
git fetch origin
git log --oneline origin/main | head -25
