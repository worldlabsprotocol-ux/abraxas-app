# FILE: scripts/ci/lib/postgres-client-16.sh
# PostgreSQL 16 client tooling for disposable parity (match postgres:16-alpine service).
# Source: `. scripts/ci/lib/postgres-client-16.sh`
#
# When POSTGRES_CLIENT_DOCKER_IMAGE is set (e.g. postgres:16-alpine), psql/pg_dump run
# inside that container with --network host. Otherwise use host binaries (/usr/lib/postgresql/16 if present).

POSTGRES_CLIENT_DOCKER_IMAGE="${POSTGRES_CLIENT_DOCKER_IMAGE:-}"

postgres_client_16_path() {
  if [ -n "$POSTGRES_CLIENT_DOCKER_IMAGE" ]; then
    return 0
  fi
  if [ -x /usr/lib/postgresql/16/bin/pg_dump ]; then
    export PATH="/usr/lib/postgresql/16/bin:${PATH}"
  fi
}

parity_psql() {
  postgres_client_16_path
  if [ -n "$POSTGRES_CLIENT_DOCKER_IMAGE" ]; then
    docker run --rm -i --network host \
      -v "${PARITY_REPO_ROOT:-/workspace}:${PARITY_REPO_ROOT:-/workspace}:ro" \
      -v "/tmp:/tmp" \
      "$POSTGRES_CLIENT_DOCKER_IMAGE" \
      psql "$@"
  else
    psql "$@"
  fi
}

parity_pg_dump() {
  postgres_client_16_path
  if [ -n "$POSTGRES_CLIENT_DOCKER_IMAGE" ]; then
    docker run --rm -i --network host \
      -v "/tmp:/tmp" \
      "$POSTGRES_CLIENT_DOCKER_IMAGE" \
      pg_dump "$@"
  else
    pg_dump "$@"
  fi
}

postgres_report_versions() {
  local url="${1:?database url required}"
  echo "postgres_client_mode: ${POSTGRES_CLIENT_DOCKER_IMAGE:+docker:${POSTGRES_CLIENT_DOCKER_IMAGE}}${POSTGRES_CLIENT_DOCKER_IMAGE:-host}"
  echo "postgres_client_pg_dump: $(parity_pg_dump --version)"
  echo "postgres_client_psql: $(parity_psql --version)"
  echo "postgres_server_version: $(parity_psql "$url" -q -t -A -c "show server_version;")"
  echo "postgres_server_version_num: $(parity_psql "$url" -q -t -A -c "show server_version_num;")"
}

postgres_assert_client_major_matches_server() {
  local url="${1:?database url required}"
  local server_major
  server_major="$(parity_psql "$url" -q -t -A -c "show server_version;" | cut -d. -f1)"
  local dump_ver
  dump_ver="$(parity_pg_dump --version)"
  if ! echo "$dump_ver" | grep -q " ${server_major}\."; then
    echo "postgres_client_major_mismatch: pg_dump=${dump_ver} server_major=${server_major}" >&2
    return 1
  fi
  if [ "$server_major" != "16" ]; then
    echo "postgres_server_major_unexpected: expected 16 got ${server_major}" >&2
    return 1
  fi
}
