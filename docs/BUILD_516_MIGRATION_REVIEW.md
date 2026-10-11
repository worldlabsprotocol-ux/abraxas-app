# Build #516 — Migration review (134–138)

## Order and dependencies

| # | File | Creates / alters | Requires |
|---|------|------------------|----------|
| 134 | `134_holder_wallet_login.sql` | `holder_wallet_accounts`, `holder_wallet_login_challenges`; grants to `service_role` | `pgcrypto` |
| 135 | `135_canonical_holder_accounts.sql` | `holder_accounts`; FK column on `holder_wallet_accounts` | 134 |
| 136 | `136_cielo_verified_guest_solana_policy.sql` | Upsert policy `cielo-verified-guest-solana-v1` | `partner_policies` (composite PK) |
| 137 | `137_good_trouble_age_21_solana_idv.sql` | `identity_verifications.holder_account_id`; policy `good-trouble-age_21_retail-solana-v1` | 135, `identity_verifications`, `partner_policies` |
| 138 | `138_decision_receipt_solana_commitments.sql` | Commitments table; RLS; `service_role` grants | `decision_receipts` |

## Destructive behavior

No `DROP TABLE`, `TRUNCATE`, or schema drops. Policy seeds use upsert. Tables use `IF NOT EXISTS`.

## Demo compatibility fix (516)

Demo `partner_policies` primary key is `(id, version)` per migration 055. Migrations **136** and **137** were updated to `ON CONFLICT (id, version)` after disposable rehearsal caught `ON CONFLICT (id)` failure.

Checksums: `scripts/build516/migration-checksum-manifest.json`.

## Idempotency

Re-applying **136** after success is safe (upsert). Table DDL uses `IF NOT EXISTS`.

## Rollback

No down migrations. Recovery via Supabase backup/PITR only.
