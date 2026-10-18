# Production migration checklist — Solana native account sign-in

**Project:** `bztwutzprwsdrtqdpymf` (worldlabsprotocol-ux's Project)  
**Do not execute without explicit founder authorization.**

## Verified pre-migration state (read-only)

- No `abraxas_accounts` table (only legacy `abraxas_credentials`).
- Migrations **144**, **145**, **146**, **147** not present on Production.

## Required order

| Step | Migration | Purpose |
|------|-----------|---------|
| 1 | `144_native_account_webauthn.sql` | `abraxas_accounts`, memberships, sandbox enrollments, WebAuthn tables |
| 2 | `145_abraxas_webauthn_hardening.sql` | Membership `status`, sandbox uniqueness, WebAuthn atomic consume |
| 3 | `146_native_account_solana_auth.sql` | Solana wallet links, auth challenges, atomic consume RPC |
| 4 | `147_native_account_sessions.sql` | Server-side session registry + validate/revoke RPCs |

**Why 145 with Solana-only sign-in:** direct PostgreSQL membership writes use `status`; sandbox enrollment uniqueness depends on 145. Solana verify does not require WebAuthn RPC, but **full account + sandbox journey does**.

## Post-migration validation SQL

Run as service role / migration operator:

```sql
-- Tables
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in (
     'abraxas_accounts',
     'abraxas_account_solana_wallets',
     'abraxas_account_solana_auth_challenges',
     'abraxas_account_sessions'
   )
 order by 1;

-- RPCs
select proname from pg_proc
 where proname in (
   'abraxas_consume_account_solana_challenge_atomic',
   'abraxas_validate_account_session',
   'abraxas_revoke_account_session'
 );
```

## Minimum operational conditions (Production enable)

- Migrations **144 → 145 → 146 → 147** applied successfully
- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1`
- `ABRAXAS_ACCOUNT_SESSION_SECRET` ≥ 32 bytes (unique Production value)
- `NEXT_PUBLIC_SOLANA_NETWORK` matches treasury/policy (e.g. `mainnet-beta` or approved devnet)
- `ABRAXAS_NATIVE_ACCOUNT_MEMORY` **disabled**
- Persistence: Supabase service role or direct PG URL configured (no in-memory fallback)
- Manual wallet sign-in checklist completed on staging/preview

## Staging reference (`ocntwbxarpjeixdnzide`)

- **144, 145, 146, 147** applied (demo project used for SQL atomic/revocation proof).
- App-level persistent wallet e2e still requires preview env + wallet extension + service credentials.

## Rollback note

Dropping 147/146 removes Solana sign-in and session revocation; retain 144/145 if passkey or sandbox data must be preserved. Coordinate with founder before destructive rollback.
