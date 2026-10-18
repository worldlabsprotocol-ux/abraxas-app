# Sovereign PostgreSQL — native Solana accounts

Abraxas-owned account, Solana authentication, and session state for the public sign-in path.
This tree is **not** Supabase-specific: apply migrations with standard PostgreSQL tooling against an
Abraxas-controlled database.

## Required environment (runtime)

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` | Direct `pg` pool (no PostgREST) |
| `ABRAXAS_DATABASE_URL` | TLS PostgreSQL connection string for the sovereign host |
| `ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT=1` | Fail closed — native account stores never use Supabase PostgREST |
| `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1` | Enable Solana / native account API routes |
| `ABRAXAS_ACCOUNT_SESSION_SECRET` | JWT signing (≥ 32 bytes) |

Optional: `ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL` when account data uses a dedicated cluster.

## Schema (migrations in `database/sovereign/migrations/`)

1. `001_native_account_core.sql` — accounts, memberships, sandbox enrollments (semantic equivalent of legacy 144)
2. `002_native_account_solana_auth.sql` — wallet credentials, challenges, atomic consume RPC (146)
3. `003_native_account_sessions.sql` — revocable sessions + validate/revoke RPCs (147)

Launchpad sandbox **provisioning** still requires partner/launchpad schema (legacy 039–086). PR B migrates
`provisionLaunchpadSandbox` to sovereign PostgreSQL for the full enroll path.

## Apply locally or in CI

```bash
export ABRAXAS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/abraxas_sovereign"
node scripts/sovereign/apply-native-account-migrations.mjs
```

## Database roles

Migrations grant DML and RPC execute to role `abraxas_runtime`. Create the role and login before production cutover:

```sql
CREATE ROLE abraxas_runtime LOGIN PASSWORD '…';
GRANT CONNECT ON DATABASE abraxas TO abraxas_runtime;
```

Use a least-privilege connection string for the application (`abraxas_runtime`), not superuser.

## Production cutover (operator — not automated)

1. Provision independent PostgreSQL (HA, backups, TLS, monitoring).
2. Apply sovereign migrations + required launchpad/partner migrations for sandbox.
3. Configure Vercel/host env: `postgres_direct`, sovereign URL, session secret, **unset** Supabase service role for native path.
4. Validate integration test job and manual Solana wallet sign-in on staging.
5. **Founder approval** before switching Production traffic or destructive data operations.

## Remaining Supabase dependencies (outside native account stores)

- Partner launchpad workspace, production activation, webhooks, metering (PostgREST today)
- Passport holder verification and institutional flows (separate product surface)
- Public build CI placeholders still reference Supabase anon keys for unrelated routes

Native account **stores** (`store.ts`, `accountSessionStore.ts`, `solanaAuth/store.ts`) do not call Supabase when sovereign mode is active.
