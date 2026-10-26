# Build #850 — Authoritative evidence integrity and Demo recovery

**No Demo or Production migrations applied.** **No v1.1.0 issuance activation.**

Base: `main` @ `f54e251a` (PR #849 merged).

## 1. Evidence and revocation migration dependencies

| Migration | Creates / extends | Prerequisites (from SQL) | Required for |
|-----------|-------------------|---------------------------|--------------|
| **033** | `decision_receipts` | `verification_decisions`, `consent_receipts` | Issuance, verification, signed status |
| **034** | `receipt_claim_dependencies`, `credential_status_events` | `credential_claims`, **033** | Claim-backed issuance, independent verification |
| **059** | `decision_receipt_revocation_events`, `revocation_reason_code` | **033**, **034** | Revocation audit, signed current status |
| **093** | `reusable_eligibility_facts`, `reusable_eligibility_derivations` | **033**, **059** | Evidence reuse, derived issuance |
| **113** | `decision_receipt_evidence_dependencies` | **093** | Reuse graph persistence, v1.1 commitment binding |
| **151** | `issuance_finalized_at`, `pending_finalization` | **033** | Staged issuance |
| **152** | v1.1 dedicated columns | **151** | Portable verification binding fields |
| **153** | `abraxas_finalize_v11_receipt_atomic` | **152** (logical: **113** before reuse finalize) | Atomic activation |

Machine-readable graph: `lib/decisionReceipts/evidenceMigrationReadiness.ts`.

**Safe Demo apply order:** `033 → 034 → 059 → 093 → 113 → 151 → 152 → 153` (skip any step already satisfied; never assume numbering alone).

## 2. Actual Demo schema (read-only, 2026-10-26)

**Project:** `ocntwbxarpjeixdnzide` (`abraxas-partner-demo`)

| Object | Demo |
|--------|------|
| `decision_receipts` | **Present** — 9 rows, all **v1.0.0**, **0** pending |
| `reusable_eligibility_facts` | **Present**, **0** rows |
| `reusable_eligibility_derivations` | **Present**, **0** rows |
| `decision_receipt_evidence_dependencies` | **Absent** |
| `decision_receipt_revocation_events` | **Absent** |
| Migrations **151 / 152 / 153** | **Absent** (status check: `active \| expired \| revoked` only) |
| `credential_claims` / `receipt_claim_dependencies` | **Present** |

Demo is **not** a full mirror of Production for every subsystem; evidence layer is **partially** ahead (093 tables) without **059** or **113**.

## 3. Fail-closed corrections (this build)

| Defect | Fix |
|--------|-----|
| `getReceiptEvidenceDependencies` returned `[]` when table missing | Throws `EvidenceDependencyStoreUnavailableError` |
| Reuse-derived validity skipped evidence when store empty | `receiptRequiresEvidenceDependencyGraph` + invalidate |
| `sourceEvidenceStillValidForReceipt` treated missing source as valid when derivation existed | Fail closed: `source_evidence_missing` |

Tests: `lib/decisionReceipts/evidenceDependencyIntegrity.adversarial.test.ts`.

## 4. Recovery capability (Demo)

| Layer | Status |
|-------|--------|
| Supabase scheduled backup / PITR for `ocntwbxarpjeixdnzide` | **Not verified** — founder must confirm in Dashboard (configured ≠ tested restore) |
| Logical export pattern (multi-table trust slice) | **Demonstrated** on disposable Postgres — `scripts/ci/run-trust-slice-backup-restore-parity.sh` |
| Encrypted signing JWK operator backup | Runbook: `docs/demo/DEMO_SIGNING_KEY_BOOTSTRAP.md` |

## 5. Disposable PostgreSQL evidence (CI)

| Script | Proof |
|--------|--------|
| `run-migration-evidence-chain-parity.sh` | Full **059→093→113→151→153** apply + idempotent re-apply |
| `run-trust-slice-backup-restore-parity.sh` | Multi-table `pg_dump` → delete → restore JSON fingerprint |
| `run-decision-receipt-backup-restore-parity.sh` | Receipt-only fingerprint (from #849) |

## 6. Outstanding founder approvals

1. **Dashboard:** confirm restorable backup / PITR for Demo before any migration apply.
2. **Migration apply window:** explicit approval to run **059, 113, 151–153** on Demo (not in this build).
3. **Post-restore attestation:** operator sign-off after a test restore (not claimed here).

## 7. Rollout boundaries (unchanged)

No Demo/Production DDL. No v1.1.0 activation, backfill, billing, key rotation, or trust-anchor changes.
