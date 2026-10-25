# Build #822 — Real Partner Flow → independent verification

**Baseline:** Build #821 merged · **No Production anchor publication** without approval

## 1. Compatibility assessment

| Artifact | Partner Flow today | Independent verifier (#819) | Gap |
|----------|-------------------|------------------------------|-----|
| Signed decision receipt | Yes (`/api/receipts/{id}/public`) | Yes (`DecisionReceiptRecord`) | Public view lacked `verification_decision_id` — **fixed** (#822) |
| Pinned trust anchor | Not exported | Required | **Bridge:** issuer env + `buildTrustAnchorBundleV1` |
| Signed issuer authority (SIAS) | Not exported | Required | **Bridge:** `publishSignedIssuerAuthorityFromRegistry` |
| Signed status statement | Live trust on fetch only | Required (unsigned rejected) | **Bridge:** sovereign PG evaluation only (#823 — no non-authoritative fallback) |
| Partner/policy/environment binding | Yes | Yes | Compatible (`sandbox_only` → `demo`) |

Production deployments without issuer export env return **503** `issuer_export_not_configured` — not silent pass.

## 2. Minimal bridge

- `lib/partner/portableIndependentVerification/` — assess readiness, build bundle, verify
- `GET /api/receipts/{receiptId}/portable-verification` — JSON bundle for partners
- `AbraxasPartnerKit.fetchPortableVerificationBundle` / `verifyReceiptWithStandaloneVerifier` (requires `integratorPinnedTrustAnchor` — see Build #823)

Issuance path unchanged; export is additive.

## 3. Partner integration steps

1. Hosted handoff / PartnerKit (issuance) — unchanged quickstart  
2. On callback, note `receipt_id`  
3. Fetch portable bundle (server-side) or pin anchor + refresh SIAS/status on your schedule  
4. Verify with `@abraxas/independent-verifier` or kit helper — **no Supabase at verify time**

## 4. Issuer-side vs verifier-side

| Role | Requires Abraxas-operated export? |
|------|-----------------------------------|
| Relying party verify | No (after artifacts in hand) |
| Fresh signed status | Yes (status signer + authoritative state) |
| SIAS for current issuer keys | Yes (anchor-signed export) |

## 5. Production gates (unchanged)

- Trust anchor publication and key rotation require explicit approval  
- No DB cutover, billing, or native-account activation in this build  

## 6. Tests

`lib/partner/portableIndependentVerification/partnerFlowPortableVerification.test.ts` — real Partner Flow receipt shape, export, standalone PASS/FAIL.

## 7. Remaining milestone

Live sandbox Partner Flow E2E against a deployment with issuer export env configured (not synthetic factory). Production parity blocked until founder approves anchor publication on Production.
