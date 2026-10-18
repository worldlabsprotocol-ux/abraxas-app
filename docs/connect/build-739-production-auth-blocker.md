# Build #739 — Production authentication blocker (read-only)

**Project ref:** `bztwutzprwsdrtqdpymf` (abraxasworld.xyz)

## Current schema (verified 2026-10-18)

| Check | Result |
|--------|--------|
| `schema_migrations` entries for 144 / 145 | **Absent** |
| `public.abraxas_accounts` | **null** (not created) |
| `public.abraxas_consume_webauthn_challenge_atomic` | **null** (not created) |

Native passkey ceremonies **cannot persist** accounts or consume challenges until migrations apply.

## Minimal operator sequence (founder authorization required)

1. **Backup** — confirm PITR / backup on `bztwutzprwsdrtqdpymf`.
2. **Apply** `supabase/migrations/144_native_account_webauthn.sql`
3. **Apply** `supabase/migrations/145_abraxas_webauthn_hardening.sql`
4. **Validate** — `scripts/operations/native-auth-post-migration-validation.sql`
5. **HTTP checks**
   - `GET /api/auth/native/enabled` → `operational: true`, `schema.ok: true`, `connect_mode: "native_passkey"`
   - `POST /api/auth/native/passkey/authenticate/options` → **200** (not 503)

## Expected validation SQL outcomes

- All `abraxas_*` native account tables present
- RPC `abraxas_consume_webauthn_challenge_atomic` exists
- Probe insert/select on `abraxas_accounts` succeeds in validation script

## Sovereign PostgreSQL (Phase B — optional, separate approval)

Direct PG (`ABRAXAS_NATIVE_ACCOUNT_PG=1`) targets the **same** database; it does **not** replace migrations 144/145. No new database was provisioned for this build.

## UI note

Connect shows **unavailable** (compact menu) while schema is missing — not Google OAuth and not a fake signed-in state.
