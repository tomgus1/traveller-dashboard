#!/usr/bin/env bash
# Tests the migrations in a throwaway Postgres 17 container (Podman or
# Docker), with Supabase's auth roles stubbed. Prints each check and exits
# non-zero if any fail.
#
#   database/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=..
ENGINE=$(command -v podman || command -v docker)
FAILED=0

fresh() {
  "$ENGINE" rm -f td-test >/dev/null 2>&1 || true
  "$ENGINE" run -d --name td-test -e POSTGRES_PASSWORD=test docker.io/library/postgres:17 >/dev/null
  for _ in $(seq 30); do "$ENGINE" exec td-test pg_isready -U postgres -q && return; sleep 1; done
  echo "Postgres didn't start" >&2; exit 1
}
apply() {
  "$ENGINE" exec -i td-test psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$1" >/dev/null 2>&1 \
    || { echo "Failed to apply $1" >&2; "$ENGINE" exec -i td-test psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$1" 2>&1 | grep -A3 ERROR >&2; exit 1; }
}
report() {
  local out
  out=$("$ENGINE" exec -i td-test psql -U postgres -q -f - < "$1" 2>&1)
  echo "$out" | grep -E "PASS|FAIL"
  echo "$out" | grep -q "FAIL" && FAILED=1 || true
}
base() {
  fresh
  apply 00-supabase-stub.sql
  for f in "$DB"/0[1-4]-*.sql; do apply "$f"; done
  apply 05-simulate-live-drift.sql   # the live database differs from 01-04
  apply "$DB"/05-security-hardening.sql
}

echo "== 05 security hardening"
base
report 10-tests-05.sql

echo "== 06 character sheets"
base
apply 20-seed-before-06.sql
apply "$DB"/06-character-sheets.sql
apply "$DB"/06-character-sheets.sql   # re-runnable
report 21-tests-06.sql

echo "== 07 owners edit sheets"
apply "$DB"/07-owners-edit-sheets.sql
apply "$DB"/07-owners-edit-sheets.sql   # re-runnable
report 22-tests-07.sql

echo "== 08 campaign state"
apply "$DB"/08-campaign-state.sql
apply "$DB"/08-campaign-state.sql   # re-runnable
report 23-tests-08.sql

"$ENGINE" rm -f td-test >/dev/null
[[ $FAILED -eq 0 ]] && echo "All checks passed." || { echo "Some checks FAILED." >&2; exit 1; }
