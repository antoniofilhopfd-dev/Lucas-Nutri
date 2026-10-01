#!/usr/bin/env bash
# Valida migrations e RLS em um Postgres puro (shim do Supabase). Uso: PGHOST=... PGPORT=... PGUSER=... bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
dropdb --if-exists bn_test && createdb bn_test
psql -q -v ON_ERROR_STOP=1 -d bn_test -f supabase/tests/shim.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d bn_test -f "$f"; done
psql -v ON_ERROR_STOP=1 -d bn_test -f supabase/tests/rls_test.sql 2>&1 | grep -E "NOTICE|ERROR|FALHOU" | sed 's/psql:[^ ]* //'
