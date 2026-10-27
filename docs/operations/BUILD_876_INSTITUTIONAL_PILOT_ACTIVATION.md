# Build 876 — Institutional pilot activation

## Objective

Reduce distance between working protocol and **organizations making real authorization decisions** — without new commercial frameworks, billing infra, or protocol abstractions.

## Reused capabilities

| Area | Reuse |
| --- | --- |
| Integration | `examples/external-node-partner`, Build **873** Demo runner (reference only) |
| Security | Build **870** enforce semantics, **874** evidence tiers (when merged) |
| Metering | `partnerMetering.ts`, `commercialMeteringAudit.ts` |
| Design partner | `PILOT_ACCEPTANCE_CHECKLIST.md`, secure handoff runbooks |

## Deliverables

- [PILOT_ACTIVATION_KIT.md](../integration/external-developer/PILOT_ACTIVATION_KIT.md)
- [WALLET_VS_TRUST_DECISION.md](../../examples/external-node-partner/WALLET_VS_TRUST_DECISION.md)
- [FIRST_PILOT_POLICY_BOUND_ENFORCEMENT.md](../commercial/FIRST_PILOT_POLICY_BOUND_ENFORCEMENT.md)
- Intro WTP + research bank split
- `lib/commercial/pilotActivation/` — unaided metrics schema
- `lib/commercial/pilotEconomics/` — cost bucket framework (no fabricated USD)

## Acceptance

```bash
npm run test:build-876-institutional-pilot-activation
npm run build876:institutional-pilot-activation-acceptance
```

Artifact: `/opt/cursor/artifacts/build-876/institutional-pilot-activation.json`

## Scorecard (honest)

| Dimension | Change |
| --- | --- |
| Adoption | **No increase** until `unaided_external_developer` metrics recorded outside git |
| Commercial | **No increase** (1/10) until real buyer WTP/pilot commitment |
| Security | Unchanged — Production pilots require 874 deployed proof where applicable |

## Completion criterion

Independent external developer integrates without bespoke protocol engineering **and** a prospective buyer evaluates this scoped pilot against a real operational need — reported **separately** (technical vs commercial vs paid commitment).
