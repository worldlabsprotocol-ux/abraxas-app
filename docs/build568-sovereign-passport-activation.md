# Build #568: Sovereign Passport activation

## Application flow audit (post Build #567 merge)

| Step | Component | Live application | Tests only / gaps |
|------|-----------|------------------|-------------------|
| 1 Wallet auth and holder subject | Passport wallet bind, `resolveSubjectForVerifiedWalletDirect` | Yes | — |
| 2 Passport sign in | Browser session, zkLogin / wallet | Yes | — |
| 3 Identity verification | Veriff, Abraxas capture, manual review | Yes | — |
| 4 Final verification approval | `authoritativeVerificationForIssuance` | Yes (postgres_direct) | Supabase path uses same commit hook when direct |
| 5 Sovereign credential issuance | `commitSovereignCredentialIssuanceDirect` | Yes | — |
| 6 Possession public key | Client generates Ed25519, server stores public key only | Yes (Passport panel) | Rotation UI partial: API supports authorized rotation |
| 7 Issuer signed reusable credential | `tryIssuePassportReusableCredentialOnClient` post-commit | Yes when storage flag + migration 140 | Deferred without possession key or claims |
| 8 Passport listing and export | `/api/passport/reusable-credentials` | Yes when storage enabled | Synthetic fallback when storage off |
| 9 Institutional policy request | Partner verification requests inbox | Yes (legacy consent URLs) | Reusable credential catalog is server pinned (Build #568) |
| 10 Holder consent and possession proof | `PassportInstitutionalPresentationPanel` | Yes (Build #568) | Requires device possession secret in sessionStorage |
| 11 Partner authorization receipt | `authorizePartnerFromReusableCredential` | Yes via `/present` | — |
| 12 Independent RP verification | `verifyReusableCredentialPartnerReceiptIndependently` | Library + tests | Production RP runs off-platform |
| 13 Revocation and replay | Portable revocation snapshot + durable challenge RPC | Yes when configured | Issuer-backed UI needs publisher URL or fails closed |

### Broken or incomplete transitions (honest)

- **Issuance visibility**: Before Build #568, Passport could imply readiness without persisted reusable credentials. Build #568 adds `/status` lifecycle states and hides credential cards until `credential_issued`.
- **Issuer-backed revocation in UI**: Presentation fails closed without `ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL` or client-supplied snapshot.
- **Founder staging**: Migration 140 is not applied automatically to shared staging or Production.
- **Partner inbox to reusable flow**: Legacy partner requests still use the original consent URL path; reusable institutional panel uses the pinned catalog for demonstration partners A and B.

## Migration 140 activation readiness

### Preflight

1. Confirm sovereign Postgres includes migrations through 139.
2. Apply `140_passport_reusable_credential_state.sql` on a disposable database first (`npm run test:passport-reusable-credential-567` includes migration 140 tests).
3. Verify tables: `passport_holder_possession_keys`, `passport_reusable_credentials`, `passport_possession_challenges`, `passport_reusable_credential_issuance_audit`.
4. Verify function `consume_passport_possession_challenge` exists and is granted to `service_role`.

### Required environment

- `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`
- `ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE=1`
- Passport credential signing key aligned with `ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY`
- Portable revocation publisher URL for issuer-backed holder UI: `ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL` (optional for sandbox credentials)

### Issuance verification

1. Register possession key from Passport.
2. Complete authoritative IDV (manual or Veriff path).
3. Call `POST /api/passport/reusable-credentials/status` with `retry_issuance_backfill` if deferred.
4. Confirm row in `passport_reusable_credentials` and GET list returns issuer-backed credential.

### Rollback

- Disable `ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE` to stop new issuance (existing rows remain).
- Do not drop migration 140 tables on Production without founder approval and backup.

## Investor milestone

A verified holder can receive one issuer-signed reusable Passport credential, register a device-controlled possession key, approve named institutional requests with explicit consent, and produce independently verifiable partner receipts without recollecting identity documents.

## Remaining deployment blockers

- Founder approval before migration 140 on shared staging or Production.
- Configured portable revocation publisher for issuer-backed presentation in live environments.
- No founder-controlled persistent staging was assumed in this build: evidence is isolated local and CI execution unless your team applies migration 140 to an approved environment.
