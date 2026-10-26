# Build #835 — Sovereign issuer authority and compromise recovery

**Prerequisite:** #834 merged (`af9c1aa4`).

## Audit — existing guarantees (not rebuilt)

| Capability | Primary code | Tests |
|------------|--------------|-------|
| Receipt verification key lifecycle | `lib/decisionReceipts/verificationKeyLifecycle/` | `verificationKeyLifecycle.test.ts` |
| Signed Issuer Authority Statements | `lib/persistence/boundary/issuerAuthority/` | `issuerAuthority.adversarial.test.ts` |
| Receipt vs status vs anchor roles | SIAS payload + env signers | `independentVerifier.adversarial.test.ts`, `signedStatus.adversarial.test.ts` |
| Partner anchor pin / rotation | `trustContinuity/integratorAnchorRegistry.ts` | `trustContinuity.adversarial.test.ts` |
| Three-layer verify + issuer revoke | `threeLayerTrustAcceptance.ts` | #820 / #834 CI |
| PG issuer key revoke helper | `staging/issuerTrustRecovery.ts` | #835 replacement scenario |

## Gaps closed in #835

1. **Operational vs unified semantics** — `evaluateReceiptCurrentValidity` now uses `deriveCurrentValidityDecision`; `operationalUnifiedParity.test.ts` guards drift from #834.
2. **Replacement issuer after compromise** — new PG scenario: revoked key A remains cryptographically verifiable but not authorized; replacement key B authorized in SIAS without permitting old receipts.

## Intentional differences (preserve)

| Topic | Sovereign + portable | Operational (PostgREST) |
|-------|----------------------|-------------------------|
| Issuer trust root | Signed SIAS + pinned anchor | Registry + `evaluateDecisionReceiptTrust` |
| Launchpad `application_id` | Not in sovereign slice yet | Gated via unified `application_scope_satisfied` |
| Storage | Direct PG when configured | Supabase default |

Unified contract aligns **fail-closed permit boolean**; it does not merge trust roots.

## Acceptance

```bash
npm run sovereign:build-835-authority-resilience
```

## Not in scope

Production key rotation, live anchor publication, new cryptography, threshold signing, public verifier release.

## Founder-gated Production actions

- Promote replacement signing keys on Production registry after real compromise
- Publish updated trust anchor bundles to partners (OOB)
- Cut operational validity to direct PG (#834 follow-on)
