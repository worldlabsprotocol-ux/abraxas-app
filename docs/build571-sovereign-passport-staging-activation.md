# Build #571: Sovereign Passport staging activation

## Readiness report (cloud agent environment)

Run locally or in staging:

```bash
npm run build
npm run build-571:staging-readiness-audit
```

Phases: **missing**, **configuration_present**, **configuration_validated**, **execution_verified**, **blocked_founder**.

Exit code **0** only when every dependency is **execution_verified**. Environment variables or table presence alone never produce exit code 0.

Founder execution evidence (optional JSON env or file path):

- `ABRAXAS_STAGING_EXECUTION_EVIDENCE_JSON`
- `ABRAXAS_STAGING_EXECUTION_EVIDENCE_PATH`

Schema: `abraxas.staging_execution_evidence/v1` requires `staging_environment_id` (must match `ABRAXAS_STAGING_ENVIRONMENT_ID`), `holder_subject_id`, and `session_ref` on browser claims. Browser `execution_verified` requires `ABRAXAS_STAGING_EXECUTION_EVIDENCE_APPROVAL_SECRET` plus valid `founder_approval_hmac` and a corroborated authentication event (`passport_wallet_auth_challenges.consumed_at` or `sui_zklogin_identities.updated_at`). Holder wallet bindings alone are insufficient.

Publisher `execution_verified` uses strict `verifyPortableRevocationAtRelyingParty` with institution-configured trust and bootstrap (never keys derived from the fetched artifact). Configure `ABRAXAS_STAGING_REVOCATION_PROBE_STATUS_ID` and `ABRAXAS_STAGING_REVOCATION_PROBE_RECEIPT_ID` for read-only publisher audits.

| Dependency | Typical cloud agent run | Notes |
| --- | --- | --- |
| Passport routes and build | execution_verified after `npm run build` | |
| Wallet and zkLogin | missing or configuration_validated | Authenticated session requires founder evidence |
| Sovereign PostgreSQL | configuration_validated or execution_verified | Connectivity probe required for execution |
| Migrations 140 to 143 | validated schema columns on connected DB | Includes consent, commits, signing claims |
| IDV and human review | blocked_founder without evidence | Legitimate operator review only |
| Credential issuer | validated public registry; execution needs signing material match | Never prints private keys |
| Possession registration | validated schema; execution needs founder evidence | |
| Revocation publisher and bootstrap | validated structure and checkpoint dir | Issuer trust bindings required |
| Institutional policies | active `partner_policies` count and optional partner id list | `ABRAXAS_STAGING_INSTITUTION_PARTNER_IDS` |
| Receipt signing and replay | validated registry; execution needs signing material and consumption dir | `ABRAXAS_STAGING_RECEIPT_CONSUMPTION_DIR` |

Database URLs are redacted in audit output (no usernames, passwords, or query strings).

## Browser execution results

### Verified

- Unauthenticated Passport on production server (`next start`): sign in unavailable when zkLogin is not configured, visible Connect or open Passport block.
- Inner Suspense fallback prevents empty shell during search params load.

### Not verified (exact blockers)

| Step | Blocker |
| --- | --- |
| Google zkLogin sign in | Missing `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` and OAuth redirect on staging origin |
| Wallet path session | Requires configured wallet auth on target deployment |
| Authenticated lifecycle UI | Depends on successful sign in |
| IDV submission and human review | No founder review operator credentials in cloud agent |
| Live institutional consent screenshots | Requires issued credential and authenticated session |

Do not treat unauthenticated screenshots as authenticated holder proof.

## Isolated integration evidence (disposable PostgreSQL)

These runs use real application code paths without Abraxas identity DB at the verifier:

```bash
export ABRAXAS_SOVEREIGN_PG_URL='postgresql://postgres:***@127.0.0.1:5432/sovereign_b568_gate'
npm run test:passport-reusable-credential-571
```

Covers: authorized IDV issuance simulation, two institution authorization, operational independent verifier CLI, adversarial rejection cases, possession key client registration ordering tests.

## Independent verifier logs

Produced inside vitest and CLI subprocess tests. Institution A and B use separate consumption and checkpoint directories. Cross institution reuse and replay after restart are exercised in Build #569 and #570 trust tests included in the 571 script.

## Product defects corrected in Build #571 scope

- **Migration 140–143 readiness probe:** schema check now expects `linked_credential_jti` on `passport_reusable_credentials` (matches migration 140 and direct stores). Previously `credential_jti` caused false `migration_column_missing` on correctly migrated disposable databases.

See `docs/build571-design-partner-acceptance.md` for the institutional handoff.

## Remaining operational dependencies for founder staging

1. Configure Google zkLogin public client id and callback URL on staging origin.
2. Apply migrations 140 to 143 on **dedicated** staging database with founder approval.
3. Provision issuer registry, credential signing, receipt signing, and portable revocation publisher.
4. Seed two test institutions with immutable policies.
5. Provide operator access to human review queue for legitimate test IDV.
6. Distribute institution trust JSON and verifier directories to design partners without database credentials.

## Evidence artifacts

| Artifact | Status |
| --- | --- |
| Unauthenticated Passport screenshot | `/opt/cursor/artifacts/build571-passport-unauthenticated.png` (Build #571, `next start` port 3010) |
| Authenticated Passport | **missing**, zkLogin blocked |
| IDV and review | **missing**, operator blocked |
| Credential issued UI | **missing** |
| Institutional consent UI | **missing** |
| Verifier success A and B | **logs in PG test output**, not browser |
