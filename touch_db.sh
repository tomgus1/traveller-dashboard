#!/bin/bash
# Pings the Supabase REST API so the project isn't paused for inactivity.
# Exits non-zero on network errors AND on HTTP errors (4xx/5xx).
set -euo pipefail

DB_URL="${VITE_SUPABASE_URL:-}"
API_KEY="${VITE_SUPABASE_ANON_KEY:-}"

if [ -z "$DB_URL" ] || [ -z "$API_KEY" ]; then
  echo "Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables must be set"
  exit 1
fi

# limit=0 keeps the response empty; RLS means the anon key sees no rows anyway.
if status=$(curl -sS --fail --max-time 30 -o /dev/null -w '%{http_code}' \
  -H "apikey: $API_KEY" "${DB_URL}/rest/v1/campaigns?select=id&limit=0"); then
  echo "✅ Database touched successfully (HTTP $status) at $(date -u)"
else
  echo "❌ Failed to touch database at $(date -u)"
  exit 1
fi
