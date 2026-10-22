# Wallet-control sharing consent — server gate (post-#788)

Status: shipped on `main` via merge commit `c2cb6de4` (includes `a95cf637`).

## What this gate proves

- The holder browser session was **authenticated** when Abraxas issued sharing consent.
- **Method qualification** for the exact partner / policy / `verify_request` was satisfied before consent issuance.
- **Completion** requires both qualification and a **matching**, **signed**, **short-lived** consent cookie bound to session `sub`, partner, policy, and verify request.

## What this gate does **not** prove

- **Independent human attestation.** A server-issued HttpOnly cookie is not standalone evidence that a person clicked Approve; it only records that the server accepted a consent POST under the checks above.
- **Durable holder-consent record.** Consent is carried in a ~15-minute JWT cookie, not a standalone `consent_receipts` row for this wallet-control path. Audit emission is **best-effort** (`partner_flow.consent`, outcome `sharing_consent_granted`).
- **Long-lived verifiability.** Partners verifying receipts later cannot re-derive this cookie; they rely on issued decision receipts and existing audit/receipt infrastructure.

## Residual risks to track

| Risk | Mitigation today | Follow-up |
|------|------------------|-----------|
| Cookie replay within TTL | Bound to session, request, partner, policy; cleared on successful complete | Adversarial replay tests across tabs / session refresh |
| Cross-holder reuse | JWT `sub` must match browser session at complete | Covered in unit tests |
| Forged cookie | HMAC with server secret | Wrong-secret tests |
| Missing audit row | Best-effort only | Optional: persist consent receipt aligned with `/verification-requests/:id/consent` |
| Revocation / decline | Decline must not issue cookie; revoked qualification should block consent POST | Staging E2E with Phantom |
| Pre-deploy in-flight requests | Fail closed if consent missing | Monitor error rates post-deploy |

## Production smoke (unauthenticated)

- `POST /api/v1/partner-flow/complete` → **401** `Sign in required in this browser`
- `POST /api/v1/partner-flow/sharing-consent` → **401** (same)

Authenticated negative paths (qualification without consent → **403**) are covered by Vitest route boundaries on `main`.

Research and draft visuals live outside the product: `docs/internal/` and `/internal/visual-draft` (noindex).
