# Pilot program charter

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Purpose

Describe the **beta-stage** design-partner / pilot program for integrators. This charter does not create binding obligations. Signed agreements are an **external next step** (counsel).

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Cited implementation or documentation. |
| **Internal beta objective** | Operational target, not a guarantee. |
| **Requires external validation** | Legal clearance, signed pilot evidence, independent review. |

---

## Program goal

Enable **age-gated digital commerce** integrators to evaluate Partner Flow: holders verify once; the documented partner-output path returns policy-bound derived claims and cryptographically signed decision receipts.

Abraxas is a **trust and authorization layer**, not a KYC provider — `README.md` L7–8.

---

## Ideal customer profile (primary)

| Attribute | Description |
|-----------|-------------|
| Use case | Digital merchants or platforms with age-gated checkout or access |
| Need | Reusable eligibility proof + audit trail; the documented partner-output path does not include raw ID images |
| Integration | Browser Partner Flow (`evaluate` / `complete` / `refresh`) + receipt verification |

Positioning examples (marketing, not legal approval): `lib/complianceGatePositioning.ts` L14–17 (alcohol, hospitality, marketplaces).

---

## Secondary / future: cannabis

| Topic | Status |
|-------|--------|
| Technical reference wiring | Good Trouble pilot paths — `lib/goodTrouble/*`, migrations `050`–`051` |
| Charter priority | **Secondary / future** — not the primary pilot wedge in this document |
| Honesty | "Pilot integrations only where law and partner contracts allow" — `lib/complianceGatePositioning.ts` L20–21 |
| Production readiness | `docs/PRODUCTION_READINESS_AUDIT.md` verdict **NOT PRODUCTION READY** for full Good Trouble journey |

Cannabis pilots require **operator and counsel confirmation** beyond this engineering charter.

---

## What Abraxas provides (verified in repo)

| Capability | Evidence |
|------------|----------|
| Partner Flow APIs | `app/api/v1/partner-flow/*`; `public/openapi/partner-flow.openapi.yaml` |
| Integrator documentation | `app/docs/partner-flow/page.tsx`; `lib/partner/partnerFlowIntegratorKit.ts` |
| Design-partner application | `app/integrations/`; `app/api/integrations/apply/route.ts` |
| Sandbox credential pattern | Design-partner page references `abx_test_` prefix — `app/design-partner/page.tsx` L75 |
| Operator onboarding | `docs/PARTNER_ONBOARDING_CHECKLIST.md`; `lib/admin/partnerOnboardingConsole.ts` |
| Signed decision receipts | `lib/decisionReceipts/service.ts` |
| Derived partner claims (`over_21`, etc.) | `lib/partner/partnerVerificationResult.ts` — **not DOB-derived** |

---

## Partner responsibilities

| Item | Detail |
|------|--------|
| Integrate Partner Flow per OpenAPI and integrator kit | Conformance: `npm run partner:conformance` |
| Configure return URLs and API keys via operator onboarding | No self-serve production provisioning — `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md` |
| Verify receipts server-side | Public verification endpoint documented in trust model |
| Own merchant compliance for target market | **Requires external validation** — counsel |

---

## 30-day pilot structure (template)

Adapted from outreach template — `lib/designPartnerOutreach.ts` L25–31:

| Week | Focus |
|------|-------|
| 1 | Sandbox integration — snippet, test policy, sandbox API key |
| 2–3 | Gate one age-gated flow (e.g. checkout or account creation) |
| 4 | Measure time-to-verify, conversion, manual review hours saved |

Success metrics: **operator-filled** in `docs/commercial/INTEGRATION_KPI_SCORECARD.md`.

---

## Gates before production keys

| Gate | Evidence path |
|------|---------------|
| Conformance kit pass | `npm run partner:conformance` |
| Operator provisioning complete | `docs/PARTNER_ONBOARDING_CONSOLE.md` |
| Policy published with intended `minimum_age` | `lib/policy/productionPolicyContract.ts` (example: 21 for Good Trouble retail) |
| Beta limitations acknowledged | `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` |
| Release gates (org-level) | Human IAT, external review, second RP — **pending** per `docs/RELEASE_READINESS.md` |

---

## Known limitations (verified)

| Limitation | Evidence |
|------------|----------|
| `over_21` is policy-derived boolean | `lib/partner/partnerVerificationResult.ts` L65–66 — not DOB extraction |
| Biometric engine does not enforce age | `docs/VERIFICATION_V1_AUDIT.md` L98 |
| Entitlements observe-only (no blocking/billing) | `lib/partner/partnerEntitlements.ts` L1–2, L35 |
| Second external relying-party pilot pending | `docs/RELEASE_READINESS.md` L19 |
| Admin sandbox demo disclaims age gate | `docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md` L12; `app/admin/partner-sandbox-demo/PartnerSandboxDemoClient.tsx` |
| No paid pilot pricing in repo | External next step — founder |

---

## Application intake

| Channel | Evidence |
|---------|----------|
| Design partner hub | `app/design-partner/page.tsx` |
| Integrations apply API | `app/api/integrations/apply/route.ts` |

**Internal beta objective:** "We review within 48h" — `app/design-partner/page.tsx` L75. This is **not** a contractual SLA, guarantee, or service-credit commitment.

---

## External next steps

| Deliverable | Owner |
|-------------|-------|
| Pilot agreement | Counsel |
| DPA | Counsel |
| Pricing and paid pilot terms | Founder |
| Legal memo for target market | Counsel |
