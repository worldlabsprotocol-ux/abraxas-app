# Build #579: Production migration release safety

Canonical product: https://abraxasworld.xyz  
Database: existing Supabase PostgreSQL (`bztwutzprwsdrtqdpymf`).

## Preflight (read only)

1. Archive Supabase PITR or on-demand backup checkpoint.
2. Run `scripts/build-579/production-migration-preflight.sql` with a read-only role; store JSON output.
3. Run `scripts/build-578/production-schema-probes.sql` for spot checks.
4. **Fail preflight** if:
   - `migrations_140_143.passport_reusable_credentials` is true but `linked_credential_jti` is false (schema drift).
   - Two different legacy anchors already map to different canonical subjects (check with holder identity backfill dry run).
   - Application traffic tests show PostgREST breakage on `identity_verifications` or `passport_documents` after staging rehearsal.

Build #578 evidence: Production currently lacks migrations **136 through 143**; legacy Sui-anchored IDV remains. Do not infer readiness from Git files alone.

## Migration sequence (founder authorized apply only)

| Order | Migration | Transaction boundary | Risk |
| --- | --- | --- | --- |
| 1 | `136_passport_holder_subjects.sql` | Single `BEGIN…COMMIT` | Low DDL; adds tables + IDV column |
| 2 | `137_idv_holder_subject_columns.sql` | Single transaction | Medium; relaxes NOT NULL on review/biometric Sui columns with checks |
| 3 | `138_sovereign_idv_evidence_custody.sql` | Single transaction | Low |
| 4 | `139_sovereign_idv_claims_evidence.sql` | Single transaction | Low |
| 5 | `140_passport_reusable_credential_state.sql` | Single transaction | Medium; RLS + grants + security definer function |
| 6 | `141_passport_institutional_presentation_consent.sql` | Single transaction | Low; RLS without service_role grants (direct pg role must be privileged) |
| 7 | `142_passport_institutional_authorization_commits.sql` | Single transaction | Low |
| 8 | `143_passport_authorization_signing_claim.sql` | Single transaction | Low |

Apply during a maintenance window. No concurrent destructive DDL.

## Holder identity reconciliation (before issuance activation)

1. Run backfill **plan** (`planLegacyIdentityBackfill` in `lib/passport/holderIdentityReconciliation.ts`) against exported anchor inventory (Sui addresses from verified rows, verified wallet CAIP10 bindings, zkLogin subs).
2. Operator approves each `create_canonical_subject_and_link` row.
3. Execute idempotent SQL inserts into `passport_holder_subjects`, `passport_holder_legacy_links`, and update `identity_verifications.holder_subject_id` only where authoritative.
4. **Never** merge on email, name, or unverified wallet strings.

## Post migration verification

- Re-run Build #579 preflight JSON; all `migrations_140_143` flags true.
- Hybrid binding probe (Build #577): PostgREST ref matches direct Postgres host ref.
- Application: `/api/passport/reusable-credentials/status` returns `holder_identity.state` = `canonical_subject_ready` for test holder after linking.
- Regression: `npm run test:production-schema-578` and disposable PG lifecycle tests.

## Recovery

- **Rollback:** restore database from preflight backup (forward migrations are not auto-reversed).
- **App rollback:** disable `ABRAXAS_PASSPORT_TRANSACTION_PG` and `ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE`; PostgREST-only mode continues serving legacy IDV.

## Founder approvals still required

- Production DDL apply (136–143).
- `ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED=true` and direct database URL on Vercel.
- Issuer registry, credential signing, receipt signing, revocation publisher.
- Witnessed e2e before issuance storage flag on Production.
