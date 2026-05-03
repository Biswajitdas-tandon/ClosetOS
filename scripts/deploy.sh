#!/usr/bin/env bash
# One-shot deploy helper for ClosetOS web → Vercel.
# Usage: scripts/deploy.sh
#
# Prerequisites (one-time):
#   1. npm install -g vercel    (or use `npx vercel@latest`)
#   2. vercel login             (opens browser)
#
# This script:
#   - Links the project (idempotent)
#   - Pushes env vars from apps/web/.env.local to Vercel (production)
#   - Deploys --prod
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="apps/web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE not found"
  exit 1
fi

cd apps/web

# Link if not already linked
if [ ! -d ".vercel" ]; then
  echo "→ Linking project. Accept defaults (project name, root)…"
  npx vercel@latest link
fi

echo "→ Pushing env vars from .env.local → Vercel production"
while IFS='=' read -r key value || [ -n "$key" ]; do
  [[ "$key" =~ ^# || -z "$key" ]] && continue
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/')
  if [ -n "$value" ]; then
    echo "   • $key"
    printf '%s' "$value" | npx vercel@latest env add "$key" production --force >/dev/null 2>&1 || true
  fi
done < ../.env.local 2>/dev/null || true

# Read from web's own .env.local
while IFS='=' read -r key value || [ -n "$key" ]; do
  [[ "$key" =~ ^# || -z "$key" ]] && continue
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/')
  if [ -n "$value" ]; then
    echo "   • $key"
    printf '%s' "$value" | npx vercel@latest env add "$key" production --force >/dev/null 2>&1 || true
  fi
done < .env.local

echo "→ Deploying to production…"
npx vercel@latest --prod

echo ""
echo "✓ Done. Don't forget:"
echo "  1. Add the new domain to Supabase → Auth → URL Configuration → Redirect URLs"
echo "     e.g.  https://<your-project>.vercel.app/auth/callback"
echo "  2. Set Site URL there too."
