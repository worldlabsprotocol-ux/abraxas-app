# FILE: scripts/ci/lib/postgres-client-16.sh
# Prefer PostgreSQL 16 client binaries to match postgres:16-alpine CI services.
# Source from parity scripts: `. scripts/ci/lib/postgres-client-16.sh`

postgres_client_16_path() {
  if [ -x /usr/lib/postgresql/16/bin/pg_dump ]; then
    export PATH="/usr/lib/postgresql/16/bin:${PATH}"
  fi
}

postgres_report_versions() {
  local url="${1:?database url required}"
  postgres_client_16_path
  echo "postgres_client_pg_dump: $(pg_dump --version)"
  echo "postgres_client_psql: $(psql --version)"
  echo "postgres_server_version: $(psql "$url" -q -t -A -c "show server_version;")"
  echo "postgres_server_version_num: $(psql "$url" -q -t -A -c "show server_version_num;")"
}

postgres_assert_client_major_matches_server() {
  local url="${1:?database url required}"
  postgres_client_16_path
  local server_major
  server_major="$(psql "$url" -q -t -A -c "show server_version;" | cut -d. -f1)"
  local dump_ver
  dump_ver="$(pg_dump --version)"
  if ! echo "$dump_ver" | grep -q " ${server_major}\."; then
    echo "postgres_client_major_mismatch: pg_dump=${dump_ver} server_major=${server_major}" >&2
    echo "Install postgresql-client-${server_major} (see migration-153-parity CI job)." >&2
    return 1
  fi
}
