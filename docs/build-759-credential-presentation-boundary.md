# Build #759 — Credential presentation boundary

## Implemented

- `evaluateEphemeralRecognizedIssuerPresentation` (server-only) reuses `verifyPassportReusableCredentialStrict`, issuer registry trust, portable revocation, and `materializeAuthenticatedClaimsForPolicy`.
- `POST /api/auth/wallet/sandbox/recognized-issuer/evaluate` evaluates holder-presented credentials without executing a signed decision.
- Age 21 **genuine** path remains unavailable in the Developer Workspace unless the authorized **sandbox test issuer** demonstration is enabled. Real recognized issuer age eligibility requires Passport holder presentation plus founder-approved Production trust configuration.

## Not claimed

- **Issuer operational:** No end-to-end test with a live external issuer credential and authoritative revocation publisher in this build.
- **Production authorized:** No Production trust root or signing changes.

## Policy claim mapping

`age_21_retail` requires `identity_verified`. Credentials that only assert `product_eligibility` / `over_21` are rejected (`missing_required_claim`). Do not equate product eligibility with age policy satisfaction without explicit schema and policy alignment.

## Holder binding

Ephemeral wallet sessions bind credentials via `subjectPseudonymId(wallet)` matching `holder_subject_id`. Passport sovereign credentials using IDV `subjectKey` require an explicit binding strategy before wallet-native presentation (not rewritten in this build).
