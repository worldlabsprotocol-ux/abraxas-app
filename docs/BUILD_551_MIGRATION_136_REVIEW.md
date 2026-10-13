# Build #551 — Migration 136 security review

## Scope

Migration file: `supabase/migrations/136_passport_holder_subjects.sql`

**Authorization status:** **NOT APPLIED** to shared demo, staging, or Production. Review-only until explicit founder authorization per environment.

## Schema diff (additive)

| Object | Purpose |
| --- | --- |
| `passport_holder_subjects` | Canonical `abx_hs_*` subjects |
| `passport_holder_wallet_accounts` | CAIP-10 bindings (`caip10` unique) |
| `passport_holder_legacy_links` | Legacy key → subject (`legacy_kind`, `legacy_key` PK) |
| `passport_evm_auth_challenges` | EIP-4361/SIWE challenges + atomic consume RPC |
| `passport_solana_auth_challenges` | Solana signed-message challenges + atomic consume RPC |
| `identity_verifications.holder_subject_id` | Chain-neutral credential ownership column + partial index |

## Security properties validated (design review)

- **Uniqueness:** One wallet CAIP-10 globally; one legacy key per kind; subject id format check.
- **Tenant isolation:** RLS enabled; only `service_role` grants (matches existing IDV tables).
- **Atomic linking:** Challenge consume functions use single-row `UPDATE … RETURNING` with expiry + consumed guards.
- **Legacy compatibility:** No drops or mutations to `sui_zklogin_identities`; legacy links are explicit inserts only.
- **Collision risk:** `abx_hs_*` format disjoint from Sui `0x…`, Solana base58, and EVM addresses used as `wallet_address` on legacy rows.

## Rollback procedure

```sql
begin;
alter table public.identity_verifications drop column if exists holder_subject_id;
drop function if exists public.consume_passport_solana_auth_challenge(text, text, text);
drop function if exists public.consume_passport_evm_auth_challenge(text, text, text);
drop table if exists public.passport_solana_auth_challenges;
drop table if exists public.passport_evm_auth_challenges;
drop table if exists public.passport_holder_legacy_links;
drop table if exists public.passport_holder_wallet_accounts;
drop table if exists public.passport_holder_subjects;
commit;
```

**Data impact:** Drops chain-neutral subjects and wallet bindings only. Legacy `identity_verifications` rows keyed by Sui/wallet remain. Rows that used `abx_hs_*` as `wallet_address` after IDV propagation would become orphaned — backfill must be planned before Production apply.

## Disposable PostgreSQL tests

Run when `MIGRATION_136_PG_URL` is set (empty database with base migrations applied):

`./node_modules/.bin/vitest run lib/institutionalCertification/migration136.sqlParity.test.ts`

CI parity script: `scripts/ci/run-migration-136-sql-parity.sh` (optional local).

## EIP-6492 / counterfactual wallets

EIP-1271 verification uses bytecode detection + `isValidSignature` on the configured chain RPC. **EIP-6492** counterfactual / undeployed smart wallets are **out of scope** unless explicitly added; they fail closed with `invalid_signature` or `rpc_unconfigured`.
