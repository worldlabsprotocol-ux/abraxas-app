# Build 898 — From sandbox result to live application enforcement

## Objective

After a successful sandbox harness, the builder must see a **single guided path** to connect their own application backend and observe **real** permit/deny enforcement — not competing primary actions or self-reported completion.

## Finish line (institutional hardening)

Completion requires **both**:

1. **Correlated partner events** for the authenticated tenant, application, and policy (handoff → receipt → integration-kit verification telemetry → access decision), excluding `dr_harness_*` and orphan `access_decision_*` rows.
2. **Platform independent verification** of the bound receipt (`verifyBuilderEnforcementReceipt`).

Partner-reported `partner_integration_events` without platform verification surface as **Partner activity recorded** with explicit blockers — not completion.

UI polling (**Check my application**) is read-only; it does not create evidence. **My server is running** was removed.

## Assurance labeling

| Class | Meaning |
| --- | --- |
| `partner_reported` | Telemetry from the partner integration kit path |
| `platform_independently_verified` | Abraxas re-verified the receipt bound to the decision |

## Reused infrastructure

| Capability | Source |
| --- | --- |
| Starter kit download | `POST /api/launchpad/applications/:id/starter-kit` |
| Integration lifecycle events | `partner_integration_events` |
| Correlation | `correlateBuilderEnforcementReceipts` |
| Platform verify | `verifyBuilderEnforcementReceipt` |
| Builder poll API | `GET /api/developers/integration-studio/external-integration-state` |
| Reference relying party | `examples/external-node-partner` |

## Tests

- Unit: `builderEnforcementCorrelation.test.ts`, `builderExternalIntegrationAcceptance.test.ts`, `externalIntegrationStateRoute.test.ts`
- Fixture RP: `./node_modules/.bin/vitest run examples/external-node-partner/externalPartner.test.ts`
- Script: `npx tsx scripts/build-898/external-rp-enforcement-fixtures.ts`

## Merge order

Merge **#897** first, rebase **#898**, rerun CI and deployed Preview acceptance.

## Founder checkpoint (still 7/10)

Live Preview: permit **and** deny from a separately operated application with platform-verified completion — not fixture tests alone.
