# Build #571: Sovereign Passport staging activation

## Readiness report (cloud agent environment)

Run locally or in staging:

```bash
npm run build
npm run build-571:staging-readiness-audit
```

Statuses: **ready**, **missing**, **blocked**.

| Dependency | Typical cloud agent run | Notes |
| --- | --- | --- |
| Passport routes and build | ready after `npm run build` | |
| Wallet and zkLogin | **missing** | `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` not set in agent VM |
| Sovereign PostgreSQL | ready with disposable DB | `ABRAXAS_SOVEREIGN_PG_URL`, not shared staging |
| Migrations 140 to 143 | ready on disposable DB | No shared staging migrations applied |
| IDV and human review | **blocked** | Requires founder operator and legitimate test records |
| Credential issuer | ready in PG integration tests | Env set in vitest harness only |
| Possession registration | ready on disposable DB | |
| Revocation publisher and bootstrap | ready in integration tests | Institution configured trusts |
| Institutional policies | ready after test seed | |
| Receipt signing and replay | ready in verifier CLI tests | Durable dirs required |

Secrets are never printed by the audit script.

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

None beyond Build #570 corrections already on main. This build adds readiness audit tooling and design partner acceptance documentation.

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
