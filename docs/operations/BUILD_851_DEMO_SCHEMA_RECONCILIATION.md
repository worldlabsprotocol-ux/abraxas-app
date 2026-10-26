# Build #851 — Demo schema reconciliation and recovery attestation

**No Demo or Production migration execution.** **No v1.1.0 activation.**

Base: `main` after PR #850 merge.

## 1. Actual Demo schema drift (`ocntwbxarpjeixdnzide`)

**Captured:** 2026-10-26 (read-only SQL via authorized Supabase access)

| Object / signal | Demo state |
|-----------------|------------|
| `decision_receipts` | **Present** — **9** rows, all **v1.0.0**, **0** pending |
| `reusable_eligibility_facts` / `derivations` | **Present**, **0** rows — columns match migration **093** |
| `revoke_derived_receipts_for_source` | **Present** (from **093**) |
| `revoke_decision_receipt_atomic` | **Absent** (migration **059** not applied) |
| `decision_receipt_revocation_events` | **Absent** |
| `decision_receipt_evidence_dependencies` | **Absent** |
| Migrations **151 / 152 / 153** | **Absent** — status check: `active \| expired \| revoked` only |
| `demo_ops.migration_ledger` | Latest entry **`065_service_role_runtime_grants.sql`** — **no 059/093/113** entries |
| `supabase_migrations.schema_migrations` | **No** matching 059/093/113 rows |

### Root cause (evidence-based)

**093_applied_without_059:** Reuse tables and `revoke_derived_receipts_for_source` exist, but **059** revocation RPC and audit table do not. This matches **manual or out-of-ledger SQL** (093 file executed without prior 059), not a complete ledger-driven rollout.

**Operational risk today:** Calling `revoke_derived_receipts_for_source` on Demo would fail at runtime when invoking missing `revoke_decision_receipt_atomic`. Current **0** reuse rows limits exposure; **9** legacy receipts remain on claim-based validity paths.

Machine-readable probe: `scripts/demo/fixtures/demo-schema-probe-851.json`  
Planner: `lib/decisionReceipts/demoSchemaReconciliation.ts`

## 2. Minimum safe corrective sequence (Demo — plan only)

Do **not** blindly re-run 033–093. For current Demo shape:

| Order | Migration | Class |
|------:|-----------|--------|
| 1 | **059** | Absent, safe create — enables atomic revoke + audit |
| 2 | **113** | Absent, safe create — evidence dependency store |
| 3 | **151** | Absent, safe create — `pending_finalization` (no change to existing active rows) |
| 4 | **152** | Absent, safe create — nullable v1.1 columns |
| 5 | **153** | Absent, safe create — finalize RPC (after 152) |

**Skip:** **093** re-apply optional (idempotent `IF NOT EXISTS` only); **not** required when tables already match.

**Do not run on Demo until:** recovery attestation complete + explicit founder approval.

## 3. Disposable reconciliation proof (CI)

`scripts/ci/run-demo-drift-reconciliation-parity.sh`:

1. Bootstrap + 033 + 034 + **093 only** (simulated drift).
2. Seed synthetic v1.0.0 receipts.
3. Apply **059 + 113** corrective SQL.
4. Idempotent **093** re-apply.
5. **JSON fingerprint** of receipt crypto fields unchanged.
6. Assert `revoke_decision_receipt_atomic` exists.

## 4. Recovery attestation (Demo)

| Item | Status |
|------|--------|
| Supabase project health | **ACTIVE_HEALTHY** (Postgres 17, `us-east-1`) |
| Logical multi-table restore pattern | **Proven** on disposable Postgres (#850 trust-slice script) |
| **Restorable backup / PITR verified** | **Not attested** — requires founder Dashboard verification |
| Test restore executed against Demo | **Not performed** (no restore privileges in this build) |
| Operator signing JWK backup | Runbook: `docs/demo/DEMO_SIGNING_KEY_BOOTSTRAP.md` |

### Operator acceptance record (template)

| Field | Value |
|-------|--------|
| Project ref | `ocntwbxarpjeixdnzide` |
| Backup available | _Founder: confirm in Supabase Dashboard → Database → Backups_ |
| Recovery point (RPO) | _Founder: note timestamp_ |
| Trust tables in scope | `decision_receipts`, `verification_decisions`, `reusable_eligibility_*`, post-migrate `decision_receipt_*` |
| Restore test status | **Not verified** in #851 |
| Authorization to apply corrective SQL | **Withheld** |

## 5. Fail-closed integrity (#850, unchanged)

Missing evidence dependency store or rows **cannot** authorize reuse-derived receipts. Legacy **v1.0.0** non-reuse receipts unaffected.

## 6. Founder approvals required before Demo DDL

1. **Backup/PITR** restorable — Dashboard proof + optional test restore to scratch project.
2. **Corrective migration window** — apply **059, 113, 151–153** in order (skip redundant 093).
3. **Post-apply verification** — receipt portable verification sample + preflight row counts.

Production remains **unchanged**.
