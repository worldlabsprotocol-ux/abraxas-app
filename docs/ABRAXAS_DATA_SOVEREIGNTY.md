# Abraxas data sovereignty and persistence boundaries

## Trust authorities (Abraxas-owned)

| Concern | Authority | Independent of host? |
| --- | --- | --- |
| Holder subject IDs (`abx_hs_*`) | Abraxas issuance rules + DB uniqueness | Yes (format + app logic) |
| Wallet ownership | Cryptographic verify (EVM/Solana/Sui) + challenge consume | Yes |
| Browser holder sessions | Signed JWT (`ABRAXAS_BROWSER_SESSION_SECRET`) | Yes |
| Passport IDV decisions | Abraxas policy + Veriff/manual pipeline | Yes |
| Credentials & claims | EdDSA issuer key (`ABRAXAS_SIGNING_KEY`) | Yes |
| Partner receipts (#546 verifier) | Signed receipt JWT + replay store semantics | Yes |
| Revocation | Abraxas revocation control plane + atomic RPCs | Yes (SQL functions portable) |

**Hosting providers (Supabase, Vercel, etc.) operate storage and network — they are not trust roots.**

## Supabase dependency inventory (Build #551 baseline)

### A. Supabase Auth (platform — not trust-critical for wallet-native Passport)

- `app/api/auth/email/request/route.ts` — `signInWithOtp`
- `components/auth/EmailWalletLogin.tsx`, `app/auth/callback/page.tsx` — client sessions

Wallet-native and partner verify paths use **Abraxas JWT cookies**, not Supabase Auth sessions.

### B. Supabase JS client as PostgreSQL HTTP adapter (convenience — replaceable)

~300+ server modules call `requireSupabaseAdmin()` / `createClient(url, SERVICE_ROLE_KEY)`.

This is **PostgREST + service role**, not Supabase Auth. Equivalent: self-hosted PostgREST, `pg`, or Drizzle against `DATABASE_URL`.

### C. Portable PostgreSQL (Abraxas migration contract)

- Canonical migrations: `supabase/migrations/*.sql` (136+ files)
- Rollbacks: `supabase/rollbacks/`
- **Not** Supabase-proprietary: plain SQL, PL/pgSQL `SECURITY DEFINER` functions, RLS policies (standard Postgres)

Build #550 **136_passport_holder_subjects.sql** adds tables/functions portable to any Postgres 14+.

### D. Supabase-specific RPC usage (portable SQL functions)

Application calls `.rpc("name")` — functions live in migration SQL. Examples:

- `consume_passport_evm_auth_challenge`, `consume_passport_solana_auth_challenge`, `consume_passport_wallet_auth_challenge`
- `ensure_partner_flow_continuation_by_opaque` (Build #548 replay)
- `revoke_decision_receipt_atomic`, `upsert_wallet_control_claim_atomic`

**Category:** PostgreSQL functionality exposed via PostgREST; **not** Supabase platform APIs.

### E. Row-level security

RLS enabled on sensitive tables; runtime uses **service_role** (bypasses RLS for server routes). Tenant isolation enforced in application logic + partner IDs.

### F. Actual remaining proprietary runtime deps

1. **PostgREST endpoint shape** via `@supabase/supabase-js` (until `ABRAXAS_DATABASE_URL` direct driver path is wired)
2. **Supabase Auth** for optional email login (non–wallet-primary)
3. **Env naming** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (alias supported — see `lib/persistence/env.ts`)

## Provider-neutral interface (minimal)

See `lib/persistence/`:

- `AbraxasPersistenceClient` — subset used by identity/wallet paths
- `requirePersistenceAdmin()` — sole server DB entry for new identity code
- `resolvePersistenceConfig()` — documents Supabase-hosted vs independent Postgres

## Migration 136 disposition

- **Required** for chain-neutral holder subjects persisted server-side (`passport_holder_subjects`, wallet bindings, challenge tables, `identity_verifications.holder_subject_id`).
- **Semantics:** portable PostgreSQL only; no Supabase extensions required.
- **Status:** review complete (`docs/BUILD_551_MIGRATION_136_REVIEW.md`); **not applied** to shared staging/Production without founder authorization.
- **Abraxas-owned contract:** migrations remain source of truth under `supabase/migrations/` (portable SQL); operational apply via any Postgres migration runner.

## Portability proof

- `lib/institutionalCertification/migration136.sqlParity.test.ts` — applies 136 on disposable Postgres when `MIGRATION_136_PG_URL` or `ABRAXAS_DATABASE_URL` is set.
- `lib/persistence/portability.contract.test.ts` — config + client factory without Supabase project ID dependency.

## Outage vs compromise

- **Outage:** App fail-closed when DB unreachable (same as any Postgres).
- **Compromise:** Service role key exposure is equivalent to DBA access — mitigate via KMS, rotation, minimal privilege, encryption at rest for sensitive columns (existing patterns for raw IDV evidence).
