# Paid pilot one-pager

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · buyer-facing · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a` |
| **Last reconciled** | 2026-08-13 |

## Beta disclaimer (required)

**Beta-stage.** Subject to **mutual agreement** and **counsel-approved contract terms**. This one-pager is **not** an offer, SLA, compliance guarantee, certification, or statement of legal sufficiency for age verification.

**Proposed 30-day paid pilot:** pricing, scope, support commitments, and contract documents are **not finalized** in this repository.

**Initial commercial wedge:** age-gated **digital commerce** (alcohol, tobacco, adult content, restricted retail, digital marketplaces). **Cannabis retail is secondary/future** and is not the initial legal or pilot scope for this document.

---

## The problem

| Pain | Detail |
|------|--------|
| Repeat age checks | Users re-upload ID at every merchant — `lib/complianceGatePositioning.ts` L8–9 |
| Data hoarding | Merchants store copies of documents they only need to gate access |
| Manual review cost | Teams re-verify the same person across flows |
| Weak audit trail | Pop-up age gates without durable, verifiable decisions |

---

## The Abraxas approach

Abraxas is a **trust and authorization layer**, not a KYC provider — `README.md` L7–8.

| Principle | What it means |
|-----------|---------------|
| **Verify once** | Holder completes Abraxas Passport / Partner Flow once |
| **Prove only what matters** | Partner policy defines required claims (e.g. `identity_verified`, `over_21` when configured) |
| **Signed eligibility receipts** | Cryptographic decision receipts partners verify server-side |
| **Minimal partner payload** | Documented partner-output path returns derived claims; current sanitizer designed to exclude raw ID fields — `lib/partner/partnerVerificationResult.ts` L20–27 |

`over_21` is **policy-derived** when your policy includes `minimum_age` — **not DOB-derived** — `lib/partner/partnerVerificationResult.ts` L65–66. It is **not** represented as legally sufficient or regulatory-grade age verification.

---

## How it works

```
1. Prospect redirects holder → Abraxas Partner Flow (browser)
2. Holder consents → zkLogin / wallet session
3. Abraxas evaluates your published policy → evaluate / complete APIs
4. Holder returns to your callback URL with receipt reference
5. Your backend verifies receipt → GET /api/receipts/{receiptId}/public
```

**Verified in repo:** `public/openapi/partner-flow.openapi.yaml` L6–16; `docs/TRUST_MODEL_V1.md`.

---

## Integration approach

| Item | Detail |
|------|--------|
| Contract | OpenAPI Partner Flow v1.0.0 — `public/openapi/partner-flow.openapi.yaml` |
| Sandbox | Design-partner flow issues `abx_test_` keys after application review — `app/design-partner/page.tsx` L75 |
| Docs | Integrator kit — `lib/partner/partnerFlowIntegratorKit.ts`; `/docs/partner-flow` |
| Conformance | `npm run partner:conformance` — `docs/PARTNER_ONBOARDING_CHECKLIST.md` |
| Provisioning | Operator-assisted — `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md` |

---

## Proposed 30-day paid pilot structure

Adapted from `docs/commercial/PILOT_PROGRAM_CHARTER.md` L81–89 and `lib/designPartnerOutreach.ts` L25–28:

| Week | Focus |
|------|-------|
| 1 | Sandbox integration — policy, test key, callback URL |
| 2–3 | Gate one age-gated flow (checkout, account creation, or access) |
| 4 | Measure time-to-verify, conversion, manual review hours saved |

**Success metrics:** operator tracks in `docs/commercial/INTEGRATION_KPI_SCORECARD.md`.

**Pricing:** **Proposed question** — subject to mutual agreement and counsel-approved pilot agreement.

---

## Beta limitations (honest)

| Topic | Status |
|-------|--------|
| Product maturity | Beta-stage — `docs/RELEASE_READINESS.md` |
| Independent security review | Abraxas is seeking an independent security review. Independent security review is planned and not yet completed. — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3 |
| Age claims | `over_21` policy-derived; not DOB extraction; not legal sufficiency — `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` L71–73 |
| Support | Founder-operated beta processes — `docs/commercial/SUPPORT_AND_ESCALATION_v0.md` |
| SLA | No contractual SLA — internal beta objectives only — `docs/commercial/BETA_SERVICE_LEVEL_APPENDIX.md` |
| Billing / entitlements | Observe-only — `lib/partner/partnerEntitlements.ts` L35 |
| Contract | Counsel-approved pilot agreement and DPA required before a proposed 30-day paid pilot |

---

## What Abraxas is / is not

| Is | Is not |
|----|--------|
| Trust and authorization infrastructure | A licensed KYC/IDV provider |
| Policy-bound signed receipts | A guarantee of regulatory compliance |
| Beta-stage pilot partner | SOC 2 / PCI / HIPAA certified |
| Focused on age-gated **digital commerce** (initial wedge) | Cannabis-specific legal clearance as first scope |

---

## Next step

1. Apply at **https://abraxasworld.xyz/integrations** — `app/integrations/`
2. 20-minute discovery call — `docs/commercial/PAID_PILOT_DISCOVERY_CALL_SCRIPT.md`
3. Technical deep-dive with your engineering lead
4. **Proposed 30-day paid pilot** only after counsel-approved contract terms

**Contact:** **Proposed target** — founder email; no dedicated `integrations@` in repo today — `docs/commercial/SUPPORT_AND_ESCALATION_v0.md`.

---

## Fact tier reference

All technical claims in this document cite repository paths at base SHA `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a`. Marketing language is not legal approval — `lib/complianceGatePositioning.ts` L20–21.
