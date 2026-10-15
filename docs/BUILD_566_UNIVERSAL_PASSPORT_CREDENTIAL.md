# Build #566 — Universal Passport credential portability

## Architecture audit (summary)

| Layer | Reusable today | Partner-bound |
|-------|----------------|-----------------|
| Active claims + identity JWT | Server-side policy evaluation per subject | Not RP-verifiable as portable VC |
| Issuer-signed **Passport reusable credential** (#566) | Holder export; one IDV → many partner authorizations | Distinct from decision receipts |
| Decision receipt + #563 presentation | Cryptographically portable file | **Audience / partner / policy bound** |
| #564 portable revocation | RP infrastructure | Per status entry |

**Gap closed in #566:** explicit `SignedPassportReusableCredential` artifact, holder `/passport` surfaces, and `authorizePartnerFromReusableCredential` deriving **new** partner receipts without repeat IDV.

## Credential vs receipt

- **Reusable credential:** issuer-signed eligibility assurance, holder possession binding, revocation status id, claim refs only (no documents/biometrics/names/DOB in partner-visible payload).
- **Partner authorization receipt:** policy evaluation outcome for one `partner_id` + `policy_id`; used in #563 presentations; must not authorize another partner.

## APIs (sandbox/demo gated in production)

| Route | Purpose |
|-------|---------|
| `GET /api/passport/reusable-credentials` | List holder summaries (demo synthetic when allowed) |
| `POST /api/passport/reusable-credentials/export` | Export signed credential (CSRF + session; not account recovery) |
| `POST /api/passport/reusable-credentials/import` | Structural validation only |
| `POST /api/passport/reusable-credentials/present` | Holder-approved partner presentation (demo) |

## Verification

`npm run test:passport-reusable-credential-566`

Includes vertical slice (one credential → two partners) and adversarial crypto tests.

## Limitations

- Demo listing/export uses synthetic fixtures outside production (`sandboxGate`).
- Live issuance from sovereign IDV into signed portable credentials requires future wiring to `issueIdentityCredential` + claims (no new migrations in this build).
- Pairwise pseudonyms still apply per partner on derived receipts.
- Not zero-knowledge selective disclosure; honest linkability on receipt metadata remains.
