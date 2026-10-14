# Demo IDV schema recovery (`ocntwbxarpjeixdnzide`)

**Authorization:** NOT APPLIED to shared demo until explicit founder approval. Production is off limits.

## 1. Minimal ordered migration manifest

These files are **required** for wallet-native Abraxas Verify capture + admin queue per current application code (`capture/route.ts`, `admin/identity/queue`):

| Order | File | Purpose |
| --- | --- | --- |
| 1 | `021_passport_documents_manual_idv.sql` | `passport_documents` table, review columns, RLS |
| 2 | `036_identity_capture_metadata.sql` | `capture_session_id`, `document_type`, `legal_name` |
| 3 | `037_biometric_assessments.sql` | `identity_biometric_assessments` |
| 4 | `050_identity_review_workflow.sql` | `identity_review_audit_log`, reviewer columns on assessments |
| 5 | `051_identity_biometric_service_update.sql` | `grant update` on assessments for admin review |
| 6 | `079_identity_review_sessions.sql` | `identity_review_sessions` (human review queue) |
| 7 | `137_idv_holder_subject_columns.sql` | `holder_subject_id` + exclusive anchor CHECKs |

**Already on demo (do not re-apply):** `136_passport_holder_subjects.sql` (and wallet auth 134–135).

**Explicitly excluded from minimal path:**

- `078_age_evidence_records.sql` — optional age-evidence ledger; not required for capture/queue routes today.
- `050_good_trouble_biometric_thresholds.sql` / `051_good_trouble_partner_return_urls.sql` — unrelated duplicate numeric prefixes.
- `037_active_wallet_unique.sql` — wallet binding uniqueness, not IDV capture.
- Numbered migrations **022–078** except **036** — not in the dependency chain for the seven files above.

## 2. Migrations that touch existing data

| Migration | Mutates existing rows? | Scope |
| --- | --- | --- |
| 021 | **Yes (conditional)** | `UPDATE passport_documents SET updated_at = created_at WHERE updated_at IS NULL` — **0 rows on demo today** |
| 036, 037, 050, 051, 079 | No | DDL only (empty tables on demo) |
| 137 | No | DDL + CHECK constraints; **does not** alter `identity_verifications`, `abraxas_credentials`, or `credential_claims` |

**Not modified by this manifest:** `identity_verifications` (1 legacy approved row), `abraxas_credentials`, `credential_claims`, `passport_holder_*`, `sui_zklogin_identities`.

## 3. Preflight checks (run on demo before apply)

```sql
-- A. Confirm target project (operator)
select current_database();

-- B. Baseline counts (preserve after apply)
select 'identity_verifications' as t, count(*) from public.identity_verifications
union all select 'abraxas_credentials', count(*) from public.abraxas_credentials
union all select 'credential_claims', count(*) from public.credential_claims
union all select 'passport_holder_subjects', count(*) from public.passport_holder_subjects
union all select 'passport_holder_wallet_accounts', count(*) from public.passport_holder_wallet_accounts
union all select 'sui_zklogin_identities', count(*) from public.sui_zklogin_identities;

-- C. Confirm IDV capture stack absent (expected today)
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('passport_documents','identity_review_sessions','identity_biometric_assessments');

-- D. Confirm 136 present
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'identity_verifications' and column_name = 'holder_subject_id';
```

## 4. Post-apply verification

```sql
-- Tables exist
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('passport_documents','identity_review_sessions','identity_biometric_assessments');

-- 137 columns
select column_name, table_name from information_schema.columns
where table_schema = 'public' and column_name = 'holder_subject_id'
  and table_name in ('passport_documents','identity_review_sessions','identity_biometric_assessments');

-- Baseline counts unchanged
-- (repeat section 3B; must match preflight)

-- Constraint smoke (should fail)
-- insert dual-anchor row into identity_review_sessions (holder_subject_id + sui_address)
```

Application probe (after deploy on `2403a503+`):

- `POST /api/auth/passport-evm/challenge` with `wallet_address`, `chain_id: 11155111`, `intended_action: passport_sign_in`
- `POST /api/auth/passport-solana/challenge` with `wallet_address`, `solana_network: devnet`
- Capture route returns **503** `chain_neutral_schema_unavailable` until `passport_documents.holder_subject_id` exists (137 applied)

## 5. Backup and restore

**Agent status:** Supabase MCP **cannot** confirm PITR/daily backup snapshots. Treat as **unverified** until an operator confirms in Supabase Dashboard → Project → Database → Backups.

**Required operator actions before apply:**

1. Confirm **restorable backup** (PITR or scheduled backup) for `ocntwbxarpjeixdnzide`.
2. Run encrypted exports (CSV/SQL) of tables in §3B — **supplement**, not a substitute for full restore.
3. Apply manifest **only** via controlled migration runner; record filenames + SHA256 in `demo_ops.migration_ledger` if used.

**Data-preserving recovery (forward repair preferred):**

1. Freeze new wallet-native capture (app already fails closed without 137).
2. Re-run manifest idempotently on restored clone; verify 3B counts match export.
3. If rollback required: drop only **new** objects in reverse order (sessions → assessments → audit log → passport_documents columns from 137) **after** confirming no production capture data depends on them.

## 6. Disposable Postgres test

```bash
export DEMO_IDV_RECOVERY_PG_URL='postgres://...'
./node_modules/.bin/vitest run lib/institutionalCertification/demoIdvSchemaRecovery.sqlParity.test.ts
```

## 7. Storage note

Migration 021 comments require private bucket `passport-documents`. Confirm bucket exists in demo Supabase Storage before live capture (not created by SQL migrations).
