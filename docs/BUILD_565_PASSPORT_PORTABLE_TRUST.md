# Build #565 — Universal Passport holder integration

## Mission

Connect proof-first protocol (#563) and portable revocation (#564) to the Abraxas Passport holder experience: receive, control, and present reusable verified authorization without re-submitting identity documents or exposing signing secrets.

## Holder surfaces

| Surface | Path |
|---------|------|
| Portable credentials panel | `/passport` → **Portable trust credentials** (`PassportPortableTrustPanel`) |
| Consent completion | `ConsentCeremony` → export link after approval |
| Developer demo | `/developers/passport-portable-trust` (synthetic E2E) |

## APIs

| Route | Purpose |
|-------|---------|
| `GET /api/passport/portable-trust/credentials` | List approved decision receipts for signed-in holder |
| `POST /api/passport/portable-trust/export` | Build holder portable presentation JSON (no private keys) |
| `POST /api/passport/portable-trust/import` | Validate imported bundle structure |
| `POST /api/passport/portable-trust/independent-verify` | Demo RP path using local registry + portable revocation |

## Cryptographic artifacts

- **Holder export**: `application/vnd.abraxas.holder-portable-presentation+json` — wraps `#563` `HolderPolicyScopedPresentation` plus disclosure metadata.
- **Partner verify**: `verifyHolderPresentationAtRelyingParty` + authenticated `#564` snapshot (demo uses synthetic registry env).

## Privacy

- Documented linkable receipt fields (`subject_pseudonym_id`, `receipt_id`, partner/policy ids, claim refs).
- Honest copy: policy-scoped presentation ≠ zero-knowledge selective disclosure.
- No universal holder tracking identifier; audience-bound receipts fail cross-partner reuse.

## Limitations (accurate)

- Export does not restore Passport login or re-issue ID documents.
- Institutional pairwise pseudonyms may differ per partner application.
- Production partner flow may still use Abraxas-hosted evaluate/consent; strict offline RP is demonstrated via developer demo and tests.
- Portable revocation publisher SLA not certified in this build.

## Verification

`npm run test:passport-portable-trust-565`
