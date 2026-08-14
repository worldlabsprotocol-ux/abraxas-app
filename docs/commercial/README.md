# Commercial documentation index

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Fact tiers (how to read these documents)

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by a cited path in this repository at the base SHA above. |
| **Planned / partial** | Described in code or docs but not fully implemented or not operator-confirmed in production. |
| **Requires external validation** | Depends on a third party (security firm, counsel, insurance broker) or signed human evidence not present in repo. |
| **Requires operator and counsel confirmation** | Referenced in code or docs; production enablement and legal classification must be confirmed outside this folder. |

**Do not infer from this folder:** commercial-ready, enterprise-ready, compliant, certified, regulatory-grade, audit-ready, SOC 2, HIPAA, PCI DSS, or legal approval.

---

## Purpose

This folder contains **engineering-owned, draft** documentation to support **beta-stage** design-partner and pilot conversations. The primary commercial wedge is **age-gated digital commerce** (alcohol, tobacco, adult content, restricted retail checkout).

Abraxas is a **trust and authorization layer**, not a KYC provider. Licensed or configured verification paths supply evidence; Abraxas issues policy-bound trust decisions and signed receipts. See `README.md` (repository root) L7–8.

---

## Document index

| File | Owner | Status | Primary audience |
|------|-------|--------|------------------|
| [COMMERCIAL_READINESS_GAP_ASSESSMENT.md](./COMMERCIAL_READINESS_GAP_ASSESSMENT.md) | Engineering | Draft | Founders, operators, diligence reviewers |
| [THIRD_PARTY_SERVICE_INVENTORY_v1.md](./THIRD_PARTY_SERVICE_INVENTORY_v1.md) | Engineering | Draft v1 | Operators, counsel (classification input only) |
| [DATA_RESPONSIBILITY_MATRIX.md](./DATA_RESPONSIBILITY_MATRIX.md) | Engineering | Draft | Operators, integrators, counsel (technical flows only) |
| [INTEGRATION_KPI_SCORECARD.md](./INTEGRATION_KPI_SCORECARD.md) | Engineering | Draft | Operators, design-partner success |
| [PILOT_PROGRAM_CHARTER.md](./PILOT_PROGRAM_CHARTER.md) | Engineering | Draft | Founders, integrators |
| [ENTERPRISE_SECURITY_OVERVIEW_v1.md](./ENTERPRISE_SECURITY_OVERVIEW_v1.md) | Engineering | Draft v1 | Security reviewers, integrators |
| [SUPPORT_AND_ESCALATION_v0.md](./SUPPORT_AND_ESCALATION_v0.md) | Engineering | Draft v0 | Operators, founders |
| [BETA_SERVICE_LEVEL_APPENDIX.md](./BETA_SERVICE_LEVEL_APPENDIX.md) | Engineering | Draft | Operators, integrators (non-contractual) |
| [INCIDENT_RESPONSE_PLAN_v0.md](./INCIDENT_RESPONSE_PLAN_v0.md) | Engineering | Draft v0 | Operators, founders |

---

## Commercial wedge scope

| Priority | Vertical | Notes |
|----------|----------|-------|
| **Primary** | Age-gated digital commerce | Positioning in `lib/complianceGatePositioning.ts` (alcohol, hospitality, marketplaces). |
| **Secondary / future** | Cannabis (21+) | Technical pilot wiring exists (`lib/goodTrouble/*`); not the primary charter. Honesty line: pilot only where law and partner contracts allow — `lib/complianceGatePositioning.ts` L20–21. |
| **Out of scope (this folder)** | Gaming/wagering, financial services, tokenized assets | Future verticals only; do not expand claims here. |

Age and eligibility outcomes depend on **configured partner policy** and **underlying verification evidence** on the active IDV path. They are not automatically DOB-derived or legally sufficient. See `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md`.

---

## Related repository documentation

| Topic | Path |
|-------|------|
| Release gate reconciliation (not a sign-off) | `docs/RELEASE_READINESS.md` |
| External security review package (no review performed) | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` |
| Privacy operator runbook (not a legal program) | `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` |
| Privacy deletion limitations | `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` |
| Partner onboarding | `docs/PARTNER_ONBOARDING_CHECKLIST.md` |
| Integration honesty | `docs/INTEGRATION_READINESS_RECONCILIATION.md` |

**Verified in repo:** External security review is **blocked** until `reports/external-security-review/independent-review.md` exists — `docs/RELEASE_READINESS.md` L18, L58.

---

## External next steps (not created in this folder)

| Deliverable | Owner |
|-------------|-------|
| MSA, DPA, pilot agreement templates | Counsel |
| Legal memos (age-gated commerce, cannabis) | Counsel |
| Privacy impact assessment (PIA) | Counsel |
| Acceptable use policy (standalone) | Counsel |
| Insurance / certificate of insurance guidance | Insurance broker |
| Independent penetration test or security review report | Security firm → `reports/external-security-review/independent-review.md` |

---

## Maintenance

Reconcile this folder when `origin/main` changes:

- IDV provider default or capture storage (`lib/idv/idvProvider.ts`, `app/api/identity/documents/capture/route.ts`)
- Partner Flow contracts (`public/openapi/partner-flow.openapi.yaml`)
- Privacy control plane or retention behavior (`lib/privacy/*`, `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md`)
- Release gates (`docs/RELEASE_READINESS.md`, `docs/BETA_GATE_EVIDENCE.md`)

Update the **Base** SHA in each file header when reconciling.
