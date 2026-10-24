# Build #823 — Real Sandbox Receipt → Independent Partner Verification

## Release gate

| Item | Result |
| --- | --- |
| PR #822 merged to `main` | **Yes** |
| Production behavior | Unchanged — Demo-only live probe; no Production trust anchors published |

## Genuine evidence

| Field | Value |
| --- | --- |
| Receipt | `dr_jSXuDfM_pFMT36du` |
| Verification decision | `9c25d9df-b230-4c90-b4ed-05dbbfb5f127` |
| Partner | `studio-accept-wc-1792620888278-6a4a2447dfc8` |
| Policy | `studio-accept-wc-1792620888278-6a4a2447dfc8-wallet_control-v1` |
| Signing key | `abraxas-demo-primary` (Demo verification-keys document) |

Historical payload hash and Ed25519 signature are fixed in `lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture.ts` (includes sovereign `wallet_binding_ref` required for canonical integrity).

## Live Demo export (2026-10-24)

Probe: `npm run build823:probe-live-demo-export`

| Check | Result |
| --- | --- |
| `GET …/public` | **200** — receipt present; **`verification_decision_id` not yet on deployed Demo** |
| `GET …/portable-verification` | **404** — Build #822 route not deployed on Demo |
| Live end-to-end export | **Not claimed** |

## Trust provenance (contract)

1. **Integrator pin required** — `verifyPortableBundle` and Partner Kit `verifyReceiptWithStandaloneVerifier` require `integratorPinnedTrustAnchor`. The bundle’s `bundled_trust_anchor` is informational until it matches the pin (`bundled_trust_anchor_not_authenticated` otherwise).
2. **No retrospective authority** — SIAS is built from the configured receipt verification registry; keys not authorized for the signing period fail closed.
3. **Authoritative status only** — Issuer export signs status via `publishSignedReceiptStatusFromSovereignEvaluation` only when `evaluation.store_available` is true. The Partner Flow **non-authoritative status fallback was removed**.

## Standalone verifier (CI)

`npm run test:build-823-real-sandbox-receipt` exercises the genuine Demo receipt bytes with:

- Integrator pin match / mismatch
- Historical cryptographic authenticity (`abraxas-demo-primary` in registry)
- Expired current authorization (authentic signature, `currently_acceptable: no`)
- Wrong partner / policy / environment
- Forged status evidence
- Missing / non-current status fields

Verification uses `@abraxas/independent-verifier` only — no Supabase, PostgREST, or Abraxas API at verify time.

## Missing sandbox configuration (live)

1. **Deploy `main`** to Demo (portable-verification route + public `verification_decision_id`).
2. **Demo issuer export env** (staging-only): trust anchor JWKs, status signer, receipt verification registry aligned with `abraxas-demo-primary` — without publishing Production anchors or re-signing the historical receipt.

**Founder gate:** authorize Demo deployment + staging issuer export keys if not already provisioned.

## Next operational action

Redeploy Demo from `main`, configure sovereign staging PG + issuer export env on Demo, re-run `npm run build823:probe-live-demo-export` until portable export returns **200** with `export_provenance.status_evidence_authoritative: true`. Then run Partner Kit verify with an independently pinned Demo trust anchor.
