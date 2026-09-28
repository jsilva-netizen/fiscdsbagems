#!/usr/bin/env bash
# Roda um teste SQL de supabase/tests/ no Supabase local (Docker), sem alterar o banco:
# cada teste abre uma transação e termina em ROLLBACK.
#
#   bash supabase/tests/rodar.sh escalada_privilegio_cadastro.sql
set -euo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_fiscdsbagems}"
TESTE="${1:?informe o arquivo de teste, ex.: escalada_privilegio_cadastro.sql}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
# Git Bash no Windows: caminhos do host em formato Windows e caminhos do contêiner sem conversão.
if [ -n "${MSYSTEM:-}" ]; then
  RAIZ="$(cd "$RAIZ" && pwd -W)"
  export MSYS_NO_PATHCONV=1
fi
DESTINO=/tmp/supabase-testes

docker exec "$CONTAINER" rm -rf "$DESTINO"
docker exec "$CONTAINER" mkdir -p "$DESTINO"
docker cp "$RAIZ/tests" "$CONTAINER:$DESTINO/tests"
docker cp "$RAIZ/migrations" "$CONTAINER:$DESTINO/migrations"
docker exec "$CONTAINER" psql -U postgres -X -q -o /dev/null -v ON_ERROR_STOP=1 -f "$DESTINO/tests/$TESTE"
