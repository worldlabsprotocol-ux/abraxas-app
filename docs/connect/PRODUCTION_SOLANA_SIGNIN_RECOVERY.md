# Production Solana sign-in recovery (pre–Build #745)

## Symptom

Public **Sign in** on https://abraxasworld.xyz shows **Sign-in temporarily unavailable** because `/api/auth/native/enabled` returns `operational: false` and `connect_mode: "unavailable"`.

The UI is correct: it must not open the wallet flow when the backend is not operational.

## Production evidence (2026-10-18)

Live `GET https://abraxasworld.xyz/api/auth/native/enabled` reported:

| Signal | Value |
|--------|--------|
| `enabled` | `true` |
| `operational` | `false` |
| `connect_mode` | `unavailable` |
| `degraded_reason` | `solana_network_not_configured` (before code fix; schema also failing) |
| `persistence.backend` | `supabase_postgrest` |
| `runtime.sovereign_native_account` | `false` |
| `runtime.direct_postgres_enabled` | `false` |
| `solana_schema.code` | `migration_144_missing` |
| `runtime.supabase_project_ref` | present (legacy PostgREST still active) |

**Root cause:** Production has native auth **flag enabled** but is still on **Supabase PostgREST** without legacy native-account tables, and **without sovereign direct PostgreSQL**. Sign-in correctly stays unavailable until independent PostgreSQL is provisioned, sovereign migrations applied, and Vercel env updated.

## Target architecture (PRs #743 / #744)

- `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`
- `ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT=1`
- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1`
- `ABRAXAS_DATABASE_URL` → **independent** PostgreSQL (not `*.supabase.co`)
- `ABRAXAS_ACCOUNT_SESSION_SECRET` (32+ chars)
- `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` (Production; app may default after recovery PR)

## Operator sequence (founder authorization required)

1. **Provision** Abraxas-controlled PostgreSQL 16+ (TLS, backups, monitoring).
2. **Network:** allow Vercel egress to DB (IP allowlist or private link).
3. **Migrate:** `ABRAXAS_DATABASE_URL=… node scripts/sovereign/apply-native-account-migrations.mjs`
4. **Verify tables:** `abraxas_accounts`, `abraxas_account_solana_wallets`, `abraxas_account_solana_auth_challenges`, sessions, sandbox tables.
5. **Configure Vercel Production env** (names only — set values in dashboard):
   - Sovereign flags above
   - Session secret
   - Solana network
   - Remove reliance on Supabase for native account path
6. **Redeploy** Production; confirm `/api/auth/native/enabled` → `operational: true`, `connect_mode: "solana_wallet"`.
7. **Founder wallet test:** Sign in → Phantom/Solflare → message signature → Account → sandbox.

## Do not

- Apply legacy Supabase migrations 144–147 as the Production target
- Enable memory persistence in Production
- Force `operational: true` in code
- Rename the unavailable message without fixing infrastructure

## Code PR scope

Clarifies Production **fail-closed** rules (sovereign mode required), improves degraded-reason ordering, documents operator actions on `/api/auth/native/enabled`, and defaults Production Solana network when unset.

**GO for sign-in** only after steps 1–7 succeed on Production.
