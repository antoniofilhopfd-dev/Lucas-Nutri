#!/usr/bin/env bash
# Gera src/lib/db/columns.generated.json a partir do banco de teste (bn_test) já migrado.
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -d bn_test -At -c "
select coalesce(jsonb_pretty(jsonb_object_agg(table_name, cols)), '{}') from (
  select c.table_name, jsonb_object_agg(c.column_name, jsonb_build_object(
    'required', (c.is_nullable = 'NO' and c.column_default is null and c.is_generated = 'NEVER' and c.is_identity = 'NO'))) as cols
  from information_schema.columns c join information_schema.tables t using (table_schema, table_name)
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE' group by c.table_name) x" > src/lib/db/columns.generated.json
echo "ok: $(grep -c required src/lib/db/columns.generated.json) colunas"
