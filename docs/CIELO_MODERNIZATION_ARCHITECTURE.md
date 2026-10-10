# Cielo Sunrise — hospitality modernization architecture

**Status:** Reconciled on draft PR [#614](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/614) (`cursor/cielo-sunrise-genesis-501-5ffe`). **Not merged.** PR #615 is superseded — do not use.

**Strategic frame:** Abraxas is reusable private eligibility infrastructure. Cielo Sunrise is the **first reference tenant**, not the architecture.

---

## Executive finding

The historical Cielo stack already routes signed decisions through **`issueReceiptForDecision`** and public receipt trust evaluation. What remains legacy is **first-party UX**, **property-specific verified-rate queue**, and the **immutable** policy id `cielo-verified-guest-v1` (wallet/account/consent emphasis). Modernization **does not** add a parallel Cielo trust system, booking engine, or treasury activation. It adds:

1. **`RentalOperatorTenantConfig`** — portable operator configuration (Launchpad-shaped).
2. **Holder disclosure** aligned with **`age_21_retail`** vocabulary without mutating DB policy rows.
3. **Synthetic second operator** portability proof (offline receipt trust).
4. **Staging harness reuse** from Builds #499–#501 (`cielo:staging-activate`).

Good Trouble, Example Merchant, and generic Partner Flow paths are **unchanged**.

---

## Dependency map (code → code)

```mermaid
flowchart TB
  subgraph modern_core [Modern Abraxas core — REUSE]
    LP[Launchpad / Integration Studio]
    PP[policyPacks age_21_retail]
    PF[Hosted Partner Flow evaluate]
    PASS[Passport / claims / reuse]
    DR[issueReceiptForDecision]
    TV[trustEvaluation / verifyPartnerFlowReceipt]
    OBS[partner_integration_events]
  end

  subgraph cielo_ref [Cielo reference tenant — ADAPT]
    FLAG[/flagship property UI]
    VR[/cielo/verified-rate]
    ADM[/admin/cielo queue]
    VRS[verifiedRateService]
    EVG[evaluateCieloVerifiedGuest]
    POL[(cielo-verified-guest-v1 immutable)]
  end

  subgraph legacy_isolated [ISOLATE / RETAIN SEPARATELY]
    PAY[/cielo/pay USDC]
    TRE[treasury / stay_requests]
    FIX[?fixture= UI only]
  end

  subgraph portable [Portable hospitality layer — NEW]
    ROC[rentalOperatorContract]
    TEN[rentalOperatorTenants]
    HPP[hospitalityPortabilityProof]
  end

  VR --> VRS --> EVG --> POL
  VRS --> DR --> TV
  EVG --> PASS
  VRS --> OBS
  ROC --> TEN
  TEN --> Cielo[Cielo tenant]
  TEN --> SynB[Synthetic operator B]
  SynB --> PF
  Cielo --> VR
  FLAG --> VR
  LP -. provisioning .-> TEN
  PAY --- TRE
```

Machine-readable component table: `CIELO_LEGACY_MODERN_COMPONENT_MAP` in `lib/partner/hospitality/rentalOperatorContract.ts`.

---

## Modern modules reused (Builds #488–#500)

| Capability | Canonical module(s) |
|------------|---------------------|
| Policy packs | `lib/partner/launchpad/policyPacks.ts` |
| Launchpad apps / tenant isolation | `lib/partner/launchpad/*` |
| Hosted holder flow | `lib/partner/referenceIntegration`, `/partner/verify` |
| Holder disclosure | `lib/partner/holderExperience/brief.ts` |
| Receipt issuance | `lib/decisionReceipts/service.ts` |
| Receipt verification | `lib/partner/verifyPartnerFlowReceipt.ts`, `trustEvaluation` |
| Observability | `lib/partner/integrationObservability/*` |
| Staging readiness | `lib/partner/universalIntegration/stagingActivationReadiness.ts` |
| Example Merchant conformance pattern | `independentPartnerScenario.ts` (pattern, not Cielo logic) |
| Playwright staging | `tests/staging/example-merchant-live-e2e.spec.ts` (reuse contract; Cielo path manual until dedicated spec) |

---

## Hospitality product boundary

| Abraxas does | Abraxas does not |
|--------------|------------------|
| Policy-scoped eligibility decisions | Booking engine / PMS |
| Signed minimal disclosure receipts | Airbnb checkout or guest records |
| Per-operator consent & purpose | Universal guest score |
| Evidence reuse under policy rules | Cross-merchant PII sharing |

**Initial policy (pilot):** Operator disclosure uses **`age_21_retail`** → **`age_eligible_21`**. Cielo’s pinned row remains **`cielo-verified-guest-v1`** until a **versioned successor** is published (`cieloPolicyDisclosureAlignment.ts`). Eligibility permit ≠ booking approval.

---

## Multi-operator model

| Field | Cielo reference | Synthetic B (proof only) |
|-------|-----------------|---------------------------|
| `partnerId` | `cielo` | `rental-synthetic-operator-b` |
| `policyId` | `cielo-verified-guest-v1` | `rental-synthetic-operator-b-age21-v1` |
| Surface | `first_party_property_ui` | `hosted_partner_flow` |
| Custom service copy | `verifiedRateService` | **None** — generic hosted flow only |

Evidence reuse: same holder may satisfy **separate** policy evaluations per tenant; receipts are **scoped** by partner/policy/application. No shared request history across tenants.

---

## Privacy & tenant isolation evidence

Offline proof: `npm run hospitality:portability-proof`

- Cross-partner receipt rejection
- Wrong `policy_id` rejection
- Expired / revoked rejection
- Separate hosted verify URLs per tenant

Live DB cross-tenant tests require demo Supabase credentials (operator).

---

## Historical data compatibility

- `legacyRequestCompatibility.ts` — `CVR-*` refs, operator statuses, audit events preserved
- No destructive migrations in this PR
- Legacy receipts retain original provenance; not reclassified as a different policy

---

## Staging

- Demo ref: `ocntwbxarpjeixdnzide` (never production)
- Command: `npm run cielo:staging-activate`
- Live holder E2E: **blocked** without preview URL, demo DB partner row, holder session

See `docs/BUILD_501_CIELO_OPERATOR_ACTIVATION.md`.

---

## Related docs

- `docs/BUILD_501_CIELO_ARCHITECTURE_RECOVERY.md` — inventory
- `docs/BUILD_502_CIELO_MODERNIZATION.md` — build notes
- `docs/CIELO_VERIFIED_RATE.md` — historical operator doc (verify against code)
