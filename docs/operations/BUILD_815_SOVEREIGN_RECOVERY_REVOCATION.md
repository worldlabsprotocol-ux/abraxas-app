# Build #815 — Sovereign state recovery and revocation verification

**Status:** Phase 2 operational proof · **Production unchanged**

**Prerequisite:** Build #814 merged (#814).

## Staging environment used

| Surface | Evidence |
|---------|----------|
| **CI (proven)** | GitHub Actions job `sovereign-operational-proof` — Postgres 16 service, databases `abraxas_sovereign_slice_primary` / `_restore` |
| **External Abraxas-controlled staging host** | **Not proven in this build** — disposable/local-equivalent only |

Execution path: `lib/persistence/boundary/sovereignStagingPg.ts` + slice SQL — **no Supabase SDK, no PostgREST, no service-role keys** in the proof test env.

## Dependencies in sovereign execution path

| Present | Absent in proof path |
|---------|----------------------|
| `pg` pool, slice schema | `@supabase/supabase-js` |
| Ed25519 verify (`verifyReceiptSignature`) | Production writer |
| Abraxas SQL readers | PostgREST |

Legacy app paths (~450 call sites) unchanged.

## Backup and restoration

- Logical export: `exportSovereignSliceBackup` (SHA-256 digest over canonical JSON)
- Restore: `restoreSovereignSliceBackup` into **fresh** database after `evaluateRestoreDrillEnv`
- Reconciliation: `reconcileSovereignSlice` + `assertReconciliationEqual` (counts + integrity digests — not row-count-only)

Verified: signed bytes (`signature`, `payload_hash`) unchanged after restore; corrupted digest rejected.

## Revocation and freshness

`evaluateReceiptFreshnessFromSovereignPg` — four layers:

1. Signature authentic  
2. Issuer authorized (`issuer_signing_keys`)  
3. Policy and audience match  
4. Currently acceptable (revocation, expiry, partner/policy operational state, store available)

**Rule:** valid signature ≠ currently acceptable (revoked/expired tests enforce this).

## Adversarial coverage

| Case | Where |
|------|--------|
| Revoked receipt | Integration |
| Backup digest tamper | Integration |
| Shadow write blocked | Integration + #814 adversarial |
| Expired receipt | Adversarial fixture |
| Store unreachable | Adversarial (unreachable PG URL) |
| Cross-tenant / policy | #814 invariant tests |

## Remaining legacy dependencies

- Production `evaluateReceiptCurrentValidity` still uses PostgREST for supersession, claims, launchpad apps
- Full issuer key lifecycle registry not yet on sovereign slice

## Measured independence improvement

- **Before #815:** fixture parity only  
- **After #815:** isolated Postgres **write → read → backup → restore → reconcile → freshness** without Supabase credentials in CI

## Next approval gate

Founder/operator: dedicated **external** sovereign staging host + TLS + encrypted backup at rest (`validateStagingPersistentEnv`) before any Production read shadow or writer cutover.

## Production restrictions (unchanged)

No Production SQL, cutover, native auth, live keys, or billing.
