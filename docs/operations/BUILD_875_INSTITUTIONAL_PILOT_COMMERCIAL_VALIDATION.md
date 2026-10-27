# Build 875 — Institutional pilot and commercial validation

## Objective

Make Abraxas **commercially understandable** without weakening protocol identity: **independently verifiable, policy-bound trust decisions** — not a generic verification API.

Builds **872** (founder UX), **873** (adoption), and **874** (security ops) continue in parallel. This build adds **no billing infrastructure**, payment providers, or subscription products.

## 1. Commercial use case (existing capabilities)

Canonical definition: `lib/commercial/pilotReadiness/institutionalPrimaryUseCase.ts`

| Element | Summary |
| --- | --- |
| **Institutional problem** | Gate access or transactions on trust outcomes without re-collecting identity every time or trusting Abraxas as the sole verifier |
| **Buyer** | Platform operator + compliance/risk; **integration owner** = engineering |
| **Measurable value** | Fail-closed enforcement in integrator app, audit trail via signed receipts, PII-free usage attribution |
| **Protocol identity** | Integrator verifies portable evidence; Abraxas issues policy-bound outcomes |

No customer demand is invented in code — gates remain `unvalidated` until interviews and pilots produce evidence.

## 2. First paid pilot (one structure)

Canonical definition: `lib/commercial/pilotReadiness/firstPaidPilotOffer.ts`

| Field | Value |
| --- | --- |
| **Organization type** | Digital platform / marketplace with server-side integration capacity |
| **Use case** | Wallet-control verification → portable receipt → **independent enforce** in partner app |
| **Environment** | Demo sandbox + Launchpad (Production only via existing review) |
| **Duration** | 90 days (proposal) |
| **Usage** | `partner_flow_receipt_issued`, deduped `partner_api_call`, optional `partner_api_usage` |
| **Acceptance** | Aligns with `docs/integration/design-partner/PILOT_ACCEPTANCE_CHECKLIST.md` + unaided integration |

Security controls reference Build **874** tiers — Production promotion requires explicit recovery evidence or documented risk acceptance.

## 3. Pricing and metering (hypotheses ≠ WTP)

| Source | Finding |
| --- | --- |
| `commercialMeteringAudit.ts` | Receipt + API metering implemented; reconciliation ETL **missing** in repo |
| `partnerCommercialPlans.ts` | Launch/Scale **estimate_only** — no collection enabled |
| `partnerMetering.ts` | PII forbidden in metering payloads |
| Infrastructure COGS | **Requires operator billing export** (Vercel/Supabase/sovereign Postgres) |

Pricing hypotheses: `buildPricingHypotheses()` in `pricingAndMeteringFindings.ts`.  
Example estimate artifact: 10k receipts / 250k API calls on Launch plan (script output).

**Willingness to pay:** `docs/commercial/WILLINGNESS_TO_PAY_INTERVIEW_v1.md` — use with prospects; do not commit interview PII.

## 4. Evidence-based commercial gates

`lib/commercial/pilotReadiness/commercialValidationGates.ts` — eight gates, default **`unvalidated`**.

`summarizeCommercialValidation()` always returns `commercial_validation_claimed: false` until founder updates gates outside automated fabrication (future: secure CRM linkage; not in this build).

## 5. Acceptance artifact (CI-safe)

```bash
npm run test:build-875-commercial-pilot-readiness
npm run build875:commercial-pilot-readiness-acceptance
```

Output: `/opt/cursor/artifacts/build-875/commercial-pilot-readiness.json`

## 6. Scorecard (honest)

| Commercial readiness | **1/10 → unchanged** |
| --- | --- |
| This build | Pilot structure + WTP process + metering economics audit |
| Raise score when | Signed paid pilot + repeat usage + validated WTP + unit economics observation |

## 7. Commercial blockers (current)

See `auditMeteringAndCostFindings().commercialBlockers` in acceptance JSON — includes missing WTP validation, no executed pilot contract, production metering suspension (BUILD_812), third-party security review, enterprise legal pack.

## Coordination

| Track | Does not block |
| --- | --- |
| 875 | 872 UAT, 873 merge/adoption, 874 drills |
| Security | Pilot scopes must list 874 `requires_operator` / `deployed_demo` gaps for Production |
