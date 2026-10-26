# Build #834 — Sovereign current-validity authority

**Baseline:** Sovereign systems assessment; main includes #831 verifier distribution.

## Gap discovered

Authoritative **current acceptability** (revocation, supersession, policy/partner lifecycle, claim/evidence freshness) was implemented on **direct PostgreSQL** via `evaluateSovereignCurrentValidity`, while Demo/Production defaults still use **PostgREST** in `evaluateReceiptCurrentValidity` and portable-export fallback. Security decisions could diverge if stores diverge.

## Reused modules

| Module | Role |
|--------|------|
| `lib/persistence/boundary/sovereignCurrentValidity/evaluate.ts` | Direct-PG validity |
| `lib/decisionReceipts/currentValidity/unifiedContract.ts` | Single fail-closed decision core |
| `lib/persistence/boundary/staging/threeLayerTrustAcceptance.ts` | Three-layer + recovery (#820) |
| `lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus.ts` | Signed status from sovereign eval |
| `@abraxas/independent-verifier` | Partner-side verify |
| `lib/persistence/boundary/sovereignSlice/*` | Schema, backup/restore |

## New behavior

- Unified contract `deriveCurrentValidityDecision` wired into sovereign evaluator.
- PostgREST trust boundary inventory (`postgrestTrustBoundary.ts`).
- Build **#834** extended adversarial matrix + CI (`build834SovereignValidityParity.ts`).

## Acceptance (this build)

```bash
npm run sovereign:build-834-validity-parity
```

1. #820 happy path + adverse scenarios pass inside #834 run.
2. Extended cases: active, expired, revoked, superseded, wrong partner/policy/env, missing store, concurrent revoke — **no unsafe permit**.
3. Signed portable path uses sovereign evaluation; **no unsigned status fallback**.
4. Recovery reconcile + post-restore standalone verifier invocation.
5. **Does not** claim Production cutover or global PostgREST removal.

## Remaining operational dependencies

| Path | Class |
|------|--------|
| `evaluateReceiptCurrentValidity` | PostgREST operational default |
| `evaluatePortableExportCurrentValidity` | Hybrid — sovereign when PG pool configured |
| Demo/Production hosted apps | Supabase + Vercel until controlled migration |

## Future controlled cutover (founder-gated, not this build)

1. Parity harness: operational evaluator reads **same** direct-PG store as sovereign for receipt slice.
2. Shadow compare in staging (`ABRAXAS_SHADOW_PERSISTENCE_COMPARE`).
3. Enable sovereign pool on Demo export path only; measure divergence.
4. Production migration only after sustained parity evidence — **not authorized here**.
