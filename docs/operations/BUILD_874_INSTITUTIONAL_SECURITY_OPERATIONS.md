# Build 874 — Institutional security operations

## Objective

Reproducible **operational evidence** that trust controls fail closed, survive appropriate restarts, and recover without breaking receipt validity, issuer authority, or tenant isolation — **without new infrastructure**.

Founder testing (872) and adoption acceptance (873) continue in parallel.

## Engineering state

- **Main** includes merged **#872** (unified journey).
- **#873** adds integration adoption (rebased on main).
- **#874** (this work) is isolated from Studio UX changes.

Evidence, Proof, Authority, and Continuity semantics unchanged; Build **870** mandatory freshness preserved.

## Operational gap audit

`lib/securityOperations/operationalGapAudit.ts` classifies each capability:

| Status | Meaning |
| --- | --- |
| `tested_in_ci` | Adversarial or integration test in repo |
| `partially_tested` | Implemented; incomplete drill coverage |
| `operational_dependency` | Operator runbook / external assessment |
| `missing` | Not implemented (none claimed closed in this build) |

**Evidence tier** (Build 874 acceptance — do not conflate with status):

| Tier | Meaning |
| --- | --- |
| `simulated_ci` | Vitest/adversarial proof in repo (this drill runner) |
| `deployed_demo` | Authorized Demo/staging failure injection with recovery artifact |
| `requires_operator` | External assessment or scheduled operator drill |

Nine passing drill suites prove **simulated** behavior unless tier is explicitly `deployed_demo`.

## Security drills (reused suites)

Run:

```bash
npm run build874:security-operations-drills
```

Artifact: `/opt/cursor/artifacts/build-874/security-operations-drills.json`

| Drill | Property | Reused test |
| --- | --- | --- |
| Signing rotation | Overlap + compromised signer rejection | `trustContinuity.adversarial.test.ts` |
| Backup restore | Restore + corrupt digest rejection | `sovereignOperationalProof.integration.test.ts` |
| Issuer freshness | Stale → deny, never permit | `issuerFreshnessEnforcement.test.ts` |
| External RP | Demo external RP verification runner | `npm run build868:demo-external-relying-party-verification` |
| Evidence deps | Dependency integrity | `evidenceDependencyIntegrity.adversarial.test.ts` |
| Tenant isolation | Cross-tenant deny | `applicationScopeContract.test.ts` |
| Replay | Wallet challenge consume replay | `walletSovereignTrustPath.adversarial.test.ts` |
| Revoked / stale status | Non-authorizing replay | `integration-first.test.ts` |
| External Node | `statement_stale` enforce | `externalPartner.test.ts` |

**Not run against live Production data.**

## Observability

No new logging of secrets or holder PII. Existing partner metering and API usage remain best-effort (`partnerMetering.ts`).

## External relying-party contract

Build **870** semantics required across consumers: mandatory failure codes → **deny**; **indeterminate** and **deny** both block authorization.

## Scorecard (honest)

| Security / operations | 6/10 → **unchanged** |
| --- | --- |
| This build | Adds drill aggregation + gap taxonomy |
| 9/10 requires | Independent assessment + demonstrated deployed recovery |

## Remaining risks

- Process-restart replay drills are in-memory / integration scope, not full VM chaos
- Incident response and on-call evidence remain operator-owned
- Production key rotation drill not automated against live tenants
