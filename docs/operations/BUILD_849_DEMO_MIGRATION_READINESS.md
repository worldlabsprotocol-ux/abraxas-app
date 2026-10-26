# Build #849 — Demo migration readiness (read-only)

**No migrations applied.** **No v1.1.0 issuance activation.** Production unchanged.

## 1. Actual Demo preflight (live read-only)

**Project:** `abraxas-partner-demo` · ref `ocntwbxarpjeixdnzide` · host `demo.abraxasworld.xyz`  
**Captured:** 2026-10-26 (Supabase SQL, read-only)

| Probe | Demo result |
|-------|-------------|
| Migration **151** (`issuance_finalized_at`, `pending_finalization`) | **Absent** — column missing; status check is `active \| expired \| revoked` only |
| Migration **152** (dedicated v1.1 fields) | **Absent** |
| Migration **153** (`abraxas_finalize_v11_receipt_atomic`) | **Absent** |
| `supabase_migrations` entries for 151–153 | **None** |
| Receipt inventory | **9** total · **9** × v1.0.0 · **0** v1.1.0 · **0** pending |
| Receipt `id` format | **text** `dr_…` (base64url suffix) |
| `decision_receipt_evidence_dependencies` | **Table absent** on Demo |
| `decision_receipt_revocation_events` | **Table absent** on Demo |

## 2. Production comparison (read-only, not a rollout target)

**Project ref:** `bztwutzprwsdrtqdpymf`

| Probe | Production result |
|-------|-------------------|
| Migrations **151 / 152 / 153** | **Same as Demo — absent** |
| Status check | Pre-151 (`active \| expired \| revoked`) |

Demo and Production are **aligned on pre-151 receipt schema** for this build; do not assume parity for other subsystems.

## 3. Migration compatibility matrix

| Storage epoch | Demo today | After 151 | After 152 | After 153 |
|---------------|------------|-----------|-----------|-----------|
| Pre-151 legacy | ✓ | — | — | — |
| Staged issuance column | — | ✓ | ✓ | ✓ |
| Dedicated sidecar columns | — | — | ✓ | ✓ |
| Atomic finalize RPC | — | — | — | ✓ |

Rules: `persistenceState.ts`, `dedicatedPersistence.ts` (#846). Classifier tests: `demoMigrationPreflight.test.ts`.

## 4. Disposable PostgreSQL evidence (CI)

| Script | Proof |
|--------|--------|
| `scripts/ci/run-migration-153-sql-parity.sh` | 033→151→152→153 apply + idempotent re-apply; `migration153.sqlParity.test.ts` (dr_ id, service_role-only RPC) |
| `migration151153Chain.sqlParity.test.ts` | Column + status constraint checks after chain |
| `scripts/ci/run-decision-receipt-backup-restore-parity.sh` | **`postgres:16-alpine` container clients** (`POSTGRES_CLIENT_DOCKER_IMAGE`) + matching service; `pg_dump` → delete → restore → JSON fingerprint parity |

## 5. Backup and recovery (Demo)

| Item | Status |
|------|--------|
| Logical export pattern | **Demonstrated** on disposable Postgres (`pg_dump` data-only) |
| Supabase PITR / scheduled backup for `ocntwbxarpjeixdnzide` | **Not verified** in this build (Dashboard confirmation required) |
| Encrypted operator backup of signing JWK | Existing runbook: `docs/demo/DEMO_SIGNING_KEY_BOOTSTRAP.md` (`signing_key_backup_required`) |
| Rollback strategy | **Forward recovery** — do not drop signed columns; revert app env flags; pending rows stay non-authorizable |

Before Demo apply: confirm **restorable backup** in Supabase Dashboard; capture encrypted exports of `decision_receipts` and related trust tables as supplement.

## 6. Backfill dry-run (Demo snapshot)

Source: read-only export → `scripts/demo/fixtures/demo-receipt-snapshot.json` (9 rows).

Command:

```bash
npm run demo:receipt-v11-backfill-dry-run
```

**Results (2026-10-26):**

| Class | Count |
|-------|------:|
| eligible | 0 |
| already_final | 0 |
| conflict | 0 |
| reject | 9 (`not_v11`) |

No v1.1.0 sidecar receipts on Demo today; post-migration backfill would activate only when v1.1.0 rows exist.

## 7. Security verification (this build)

| # | Requirement | Evidence |
|---|-------------|----------|
| 1 | Incomplete issuance not authorizable | `issuanceFinalization` + `demoMigrationReadiness.test.ts` |
| 2 | Legacy v1.0.0 valid | build546 + operational suites |
| 3 | Application scope | unchanged authoritative issuance (#844) |
| 4 | Evidence commitments | sidecar + `verifyEvidenceCommitment` in backfill planner |
| 5 | Independent signed status | independent verifier adversarial suite |
| 6–7 | RPC not callable by anon/authenticated | `migration153.sqlParity.test.ts` |
| 8 | Production unaffected | no migrations, no env activation |

Activation gates remain **disabled**: `DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0`, `DECISION_RECEIPT_V11_ATOMIC_FINALIZE=authorized`, Production migration.

## 8. Recommended Demo rollout order (founder-authorized only)

1. Confirm **backup / PITR** on `ocntwbxarpjeixdnzide`.
2. Apply **113** (and prerequisites) if staged evidence finalization is required — **currently missing on Demo**.
3. Apply **151** → deploy app with `DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA=v151` (staged path only).
4. Apply **152** (dual-read; no issuance schema flip).
5. Apply **153** → enable `DECISION_RECEIPT_V11_DEDICATED_PERSISTENCE=v152` + `DECISION_RECEIPT_V11_ATOMIC_FINALIZE=authorized` only after soak.
6. Run **backfill dry-run** on live export; founder approves execute separately.
7. Enable **`DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0`** last.

## 9. Founder authorizations required (explicit)

- [ ] Demo database backup verified restorable  
- [ ] Apply migration **151** on Demo  
- [ ] Apply migration **152** on Demo  
- [ ] Apply migration **153** on Demo  
- [ ] `DECISION_RECEIPT_V11_ATOMIC_FINALIZE=authorized` on Demo Vercel  
- [ ] v1.1.0 backfill **execute** (separate from dry-run)  
- [ ] `DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0` on Demo  

Production: **no action** in this build.
