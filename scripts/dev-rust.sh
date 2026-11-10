#!/usr/bin/env bash
# Runs the Rust (Dioxus) app locally with hot reload, like `pnpm dev`.
#
# Reads the Supabase settings from .env.local (or .env), the same file the
# React app uses, and passes them to the build. Extra arguments go to
# `dx serve`, e.g. `scripts/dev-rust.sh --port 9000 --open`.
set -euo pipefail
cd "$(dirname "$0")/.."

# Read KEY=value lines without executing the file.
read_var() {
  local file
  for file in .env.local .env; do
    if [[ -f $file ]]; then
      local line
      line=$(grep -E "^$1=" "$file" | tail -n 1 || true)
      if [[ -n $line ]]; then
        line=${line#*=}
        line=${line%\"}
        line=${line#\"}
        printf '%s' "$line"
        return
      fi
    fi
  done
}

SUPABASE_URL=${SUPABASE_URL:-$(read_var VITE_SUPABASE_URL)}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-$(read_var VITE_SUPABASE_ANON_KEY)}
export SUPABASE_URL SUPABASE_ANON_KEY

if [[ -z $SUPABASE_URL || -z $SUPABASE_ANON_KEY ]]; then
  echo "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local" >&2
  echo "The app will start but can't sign in." >&2
fi

if ! command -v dx >/dev/null; then
  echo "The Dioxus CLI (dx) isn't installed. See README: Rust app." >&2
  exit 1
fi

echo "Starting on http://localhost:8080/traveller-dashboard/ (Ctrl+C to stop)"
cd crates/app
exec dx serve --platform web "$@"
