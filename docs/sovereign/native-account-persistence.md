# Native account sovereign persistence (Phase B)

## Execution path

| Layer | Role |
| --- | --- |
| `abx_ac_*` subjects | Abraxas-owned identifiers (`lib/auth/nativeAccount/subjectId.ts`) |
| WebAuthn ceremonies | Standard crypto via `@simplewebauthn/*` |
| Store facade | `lib/auth/nativeAccount/store.ts` |
| Direct PostgreSQL | `lib/auth/nativeAccount/postgresDirectStore.ts` when `ABRAXAS_NATIVE_ACCOUNT_PG=1` |
| PostgREST fallback | `requirePersistenceAdmin()` until cutover completes |

Enable direct wire-protocol Postgres without changing subjects or receipt trust:

```bash
ABRAXAS_NATIVE_ACCOUNT_PG=1
ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL=postgresql://... # or ABRAXAS_DATABASE_URL
```

Hosting note: connecting to Supabase’s Postgres host via `pg` removes the **Supabase SDK/PostgREST** dependency from the native path but **not** Supabase as host until Phase C cutover.

## Phase A — Connect safety (code)

When the feature flag is on but schema is missing, `operational: false` and Connect uses **Passport recovery** (`/passport`). Passkey routes return **503** `native_account_store_unavailable`, not opaque **500**.

## Phase C/D

Self-managed Postgres, backups, monitoring, and traffic cutover remain operator-controlled. Do not combine first Production migration (144/145) with host migration in one step.
