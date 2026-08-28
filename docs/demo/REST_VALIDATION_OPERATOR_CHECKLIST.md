# REST validation - read-only operator checklist

Use this checklist when **catalog validation passes** (`npm run demo:validate -- --catalog --confirm <demo-ref>` -> exit 0) but **REST validation fails uniformly** (`npm run demo:validate` -> exit 1 with the same sanitized category on every table probe).

Catalog mode proves PostgreSQL structure, RLS, indexes, sandbox seeds, and `service_role` table privileges via a direct read-only connection. REST mode proves the **Supabase Data API / PostgREST path** with `NEXT_PUBLIC_SUPABASE_URL` + a runtime `SUPABASE_SERVICE_ROLE_KEY` (never stored in `.env.demo.local`).

## Before changing anything

- Confirm `DEMO_SUPABASE_PROJECT_REF` matches the isolated demo project (`ocntwbxarpjeixdnzide` for the current demo).
- Confirm `PRODUCTION_SUPABASE_PROJECT_REF` matches the immutable denylist and is **not** the demo ref.
- Do **not** apply checklist fixes to production Supabase without a separate reviewed operator decision.

## Write-only required tables (audit_events)

Migration 065 originally documented `service_role` **INSERT only** on `public.audit_events`. Production pre-073 drift exposed broader table ACLs (including `SELECT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`).

Migration **073** (Phase 1 privilege hardening) resets `audit_events` to **`service_role` INSERT + SELECT only** (SELECT retained temporarily for `appendAuditEvent` insert-return and direct receipt/trace reads until Phase 2 read RPCs and Phase 3 append RPC + SELECT revoke land in separate PRs).

REST validation:

- does **not** issue a SELECT/head probe;
- does **not** perform an INSERT;
- marks `audit_events` as **UNVERIFIABLE** / `catalogValidatedOnly`;
- does **not** fail REST exit status when all other required probes pass.

Run catalog mode for authoritative table existence and privilege evidence. After migration 073 is applied in an environment, catalog should expect `INSERT` and `SELECT` for `service_role` on `audit_events`, not `UPDATE`/`DELETE`/`TRUNCATE`.

## 1. Data API enabled

In the isolated demo Supabase project:

1. Open **Project Settings -> API** (or **Data API** in newer dashboards).
2. Confirm the **Data API / REST API** is **enabled** for the project.
3. If disabled, REST probes fail before PostgREST can return structured JSON - the validator may report `network_or_transport_failure [unknown] http=0` or `unknown_query_error [unknown]` depending on gateway behavior.

**Expected when correct:** HTTP responses from `https://<demo-ref>.supabase.co/rest/v1/...` return JSON error bodies with PostgREST codes (for example `PGRST205`, `42501`) rather than HTML or empty bodies.

## 2. `public` included in exposed schemas

PostgREST only serves tables in schemas listed in the project's exposed schema configuration.

1. In **Project Settings -> API -> Exposed schemas** (wording may vary), confirm **`public`** is included.
2. Confirm **"Automatically expose new tables"** posture matches operator intent. Demo project keeps auto-expose **disabled**; tables still require explicit exposure/grants (migration `065` added `service_role` grants but does **not** change dashboard exposure settings).
3. If `public` tables exist in PostgreSQL but are not exposed to PostgREST, probes typically return **`PGRST205`** (`schema_cache_unavailable`) once the response is parsed - not `permission denied` at the SQL layer.

**Catalog vs REST:** Catalog can show full `service_role` grants while REST still fails when the Data API schema cache does not list the table.

## 3. `service_role` key belongs to the demo project

REST validation signs every request with `SUPABASE_SERVICE_ROLE_KEY`. A key from another project or environment produces uniform auth failures across all probes.

1. In the demo project dashboard, open **Project Settings -> API -> Project API keys**.
2. Copy the **`service_role` secret** for **this** project only.
3. Provide it at runtime via a hidden Bash prompt (input not echoed). **Do not** write it to `.env.demo.local`, shell history files, or tickets.
4. Confirm `NEXT_PUBLIC_SUPABASE_URL` host is `https://<demo-ref>.supabase.co` where `<demo-ref>` equals `DEMO_SUPABASE_PROJECT_REF`.
5. Run REST validation, then `unset SUPABASE_SERVICE_ROLE_KEY` immediately.

```bash
set -a
source .env.demo.local
set +a
read -rsp "Demo SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo
npm run demo:validate
unset SUPABASE_SERVICE_ROLE_KEY
```

**Expected when mismatched:** Uniform `authentication_failed` or `invalid_credential` with `http=401`, or `authorization_denied` with `http=403`, often with PostgREST code `unknown` when the gateway returns a non-JSON body.

**Safe check:** Compare masked project ref printed by the validator header with `DEMO_SUPABASE_PROJECT_REF`. Do not paste keys into tickets, logs, or this repository.

## 4. PostgREST schema cache state

After migrations, privilege grants, or dashboard exposure changes, PostgREST may serve a stale schema cache.

1. In the demo project, use the dashboard action to **reload / refresh the PostgREST schema cache** (location varies by Supabase version; often under **Database -> Extensions / API** or project restart).
2. Alternatively, trigger a project restart from **Settings -> Infrastructure** if no explicit reload control is shown.
3. Re-run REST validation (`npm run demo:validate`).

**Expected when stale:** `schema_cache_unavailable [PGRST205]` on table probes until reload. If every probe still shows `unknown_query_error [unknown]` with the same `http=` and `fp=`, suspect auth/URL/Data API issues (sections 1-3) before cache alone.

## 5. Read sanitized REST diagnostics

Failed REST probes print only:

| Field | Meaning |
|-------|---------|
| `category [code]` | Allowlisted failure class and PostgREST/Postgres code |
| `http=<status>` | HTTP status from `@supabase/postgrest-js` (0 = transport failure) |
| `op=<operation>` | Validator operation (`head_count`, `maybe_single`, `select_limit`) |
| `table=<name>` | Table identifier for the probe |
| `fp=<12-hex>` | Stable fingerprint for correlating uniform failures |

The validator **never** prints API keys, JWTs, `Authorization` / `apikey` headers, raw response bodies, credential-bearing URLs, stack traces, or unrestricted server messages.

### Category quick reference

| Category | Typical cause |
|----------|----------------|
| `authentication_failed` | Wrong/expired JWT, `PGRST300`-`PGRST303`, HTTP 401 |
| `authorization_denied` | HTTP 403 from gateway before table access |
| `invalid_credential` | Malformed `SUPABASE_SERVICE_ROLE_KEY` |
| `schema_cache_unavailable` | Table not in PostgREST cache (`PGRST204`/`PGRST205`) |
| `permission_denied` | SQL `42501` - role lacks table privilege |
| `network_or_transport_failure` | TLS/DNS/fetch failure (`http=0`) |
| `unknown_query_error` | Unmapped code/body - use `http=` + `fp=` to correlate |

## 6. Commands (read-only)

```bash
# REST - requires demo service_role key at runtime only (hidden prompt)
set -a && source .env.demo.local && set +a
read -rsp "Demo SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo
npm run demo:validate
unset SUPABASE_SERVICE_ROLE_KEY

# Catalog - authoritative Postgres evidence; no service_role key
DOTENV_CONFIG_PATH=.env.demo.local npm run demo:validate -- --catalog --confirm <demo-ref>
```

Save sanitized logs under `reports/` locally; do not commit them.

## Related docs

- `docs/demo/DEMO_ENVIRONMENT_RUNBOOK.md` - full Phase A/B workflow
- `docs/demo/DEMO_VARIABLE_MATRIX.md` - environment variable matrix
- `docs/demo/DEMO_SECURITY_CHECKLIST.md` - secret handling rules
