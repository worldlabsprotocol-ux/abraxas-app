# Build 898 — From sandbox result to live application enforcement

## Objective

After a successful sandbox harness, the builder must see a **single guided path** to connect their own application backend and observe **real** permit/deny/indeterminate enforcement from `partner_integration_events` — not a second competing primary action.

## Finish line

`application_enforcement_confirmed` when live (non-`dr_harness_*`) integration events include `access_decision_permit` or `access_decision_deny`, with prior handoff/receipt/verification events.

## Reused infrastructure

| Capability | Source |
| --- | --- |
| Starter kit download | `POST /api/launchpad/applications/:id/starter-kit` |
| Integration lifecycle events | `partner_integration_events` via `loadIntegrationEventsForApplication` |
| State derivation | `deriveBuilderIntegrationAcceptance` |
| Builder poll API | `GET /api/developers/integration-studio/external-integration-state` |
| Reference local app | `examples/external-node-partner` |

## UI

`ApplicationIntegrationJourneyPanel` — three milestones (demonstrated → connect backend → final proof). Primary CTA: **Connect my application**. Independent verification is not a separate main button; engineers use Advanced + reference server docs.

## Founder checkpoint

"Abraxas is working in your application" appears only when `completion_headline` is set from authentic external enforcement events.
