# Age-gated commerce counsel brief v1

| Field | Value |
|-------|-------|
| **Status** | Draft v1 · beta-stage · founder-owned · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a` |
| **Last reconciled** | 2026-08-13 |

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by cited path. |
| **Planned / partial** | Documented but incomplete. |
| **Proposed question** | For counsel to answer. |
| **Requires external validation** | Legal analysis not in repository. |

This document is a **founder brief** requesting external legal analysis. It does **not** constitute legal advice, a contract, DPA, or compliance certification.

---

## 1. Engagement goal

Obtain a **fixed-scope legal memo** and **proposal for pilot-contract documents** covering:

- **Primary scope:** age-gated **digital commerce** (alcohol, tobacco, adult content, restricted retail checkout, digital marketplaces with age gates)
- **Explicitly not initial scope:** cannabis retail regulation (secondary/future — separate memo later)

Pricing, pilot scope, support commitments, and contract terms for any **proposed 30-day paid pilot** are subject to **mutual agreement** and **counsel-approved documents**. Nothing in this brief is a binding commercial offer.

---

## 2. About Abraxas

| Topic | Fact | Evidence |
|-------|------|----------|
| Role | **Trust and authorization layer** — not a KYC provider | `README.md` L7–8 |
| Stage | Beta-stage; release gates pending | `docs/RELEASE_READINESS.md` L16–22 |
| Product | Partner Flow: holders verify; partners receive derived claims + signed receipts | `public/openapi/partner-flow.openapi.yaml` L6–16 |
| Security review | Abraxas is seeking an independent security review. Independent security review is planned and not yet completed. | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3 |
| Positioning (marketing) | Alcohol, hospitality, marketplaces — not legal approval | `lib/complianceGatePositioning.ts` L14–17 |
| Honesty | "Does not replace counsel" | `lib/complianceGatePositioning.ts` L20–21 |

---

## 3. How age / eligibility works (technical facts for counsel)

| Topic | Engineering fact | What Abraxas does **not** claim |
|-------|------------------|----------------------------------|
| Policy | Partners configure `minimum_age` in policy rules | Not a substitute for merchant compliance program |
| Partner field `over_21` | Set when decision is `approved` and `minimumAge` is null or `identityVerified && minimumAge >= 21` | **Not DOB-derived** — `lib/partner/partnerVerificationResult.ts` L65–66 |
| Biometric engine | Does **not** enforce `minimum_age` from policy JSON | `docs/VERIFICATION_V1_AUDIT.md` L98 |
| Regulatory sufficiency | — | `over_21` is **not** legally sufficient, regulatory-grade, or compliance-approved — `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` L73 |
| Partner output | Current sanitizer designed to exclude forbidden keys (`date_of_birth`, images, etc.) | Implementation-scoped; not absolute guarantee — `partnerVerificationResult.ts` L20–27 |

Age and eligibility outcomes depend on **configured partner policy** and **underlying verification evidence** on the active IDV path.

---

## 4. Data flows (technical only — not legal roles)

**Boundary:** `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` — technical-flow description only; does not determine controller, processor, or regulatory roles.

| Path | Summary | Evidence |
|------|---------|----------|
| Abraxas-native (default) | Implementation may receive and store capture data depending on production path | `lib/idv/idvProvider.ts` L10–15; `app/api/identity/documents/capture/route.ts` |
| Veriff (opt-in) | Third-party IDV when `IDV_PROVIDER=veriff` | `lib/idv/idvProvider.ts` |
| Partner output | Documented path returns derived claims + receipt; sanitizer excludes forbidden keys | `lib/partner/partnerVerificationResult.ts` |
| Privacy policy gap | Policy emphasizes Veriff for Precheck; native path stores docs for team review | `app/legal/privacy/page.tsx` L49–54; DATA_MATRIX L45 |
| Deletion | Holder requests revoke access; many stores not purged | `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` |
| Subprocessors | Inventory is factual only; **requires operator and counsel confirmation** | `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md` |

---

## 5. Questions for counsel

### 5.1 Claims and marketing (age-gated digital commerce)

1. What may Abraxas tell **merchants** about age-gated eligibility proof given `over_21` is policy-derived and not DOB-extracted?
2. What may Abraxas tell **end users** in privacy notices and product copy?
3. What claims are **prohibited** (e.g., "verified date of birth," "regulatory-grade age verification")?
4. What disclaimers are required on website, pilot one-pager, and integration docs?

### 5.2 Proposed 30-day paid pilot (commercial structure)

5. Minimum terms for a **proposed** pilot agreement: beta disclaimers, liability caps, IP, termination, data processing roles.
6. Whether a pilot should be **paid** and what payment structure is appropriate — **Proposed question**.
7. Confirm pricing, scope, support commitments, and contract terms require **mutual agreement** and counsel-approved documents.

### 5.3 Data processing

8. Controller/processor/subprocessor roles for Abraxas, merchant, and IDV vendors (Veriff vs native capture).
9. DPA requirements and subprocessor annex based on `THIRD_PARTY_SERVICE_INVENTORY_v1.md` Section A.
10. Privacy policy updates needed if production uses Abraxas-native capture?

### 5.4 Liability and boundaries

11. Liability allocation between Abraxas, merchant, and verification vendors.
12. Merchant responsibility for jurisdiction-specific age-gating rules.
13. Insurance or indemnity recommendations — **Requires external validation** (insurance broker).

### 5.5 Jurisdiction (digital commerce focus)

14. State-by-state or country-level issues for **digital** age-gated commerce (not in-person cannabis retail).
15. COPPA/minor-protection considerations for 18+ services — **Requires external validation**.

### 5.6 Cannabis (secondary / future — not this engagement's primary scope)

16. Acknowledge technical reference wiring exists (`lib/goodTrouble/*`) but **cannabis is not the initial legal or pilot scope**.
17. **Proposed question:** separate fixed-scope memo for cannabis if pursued later.

---

## 6. What Abraxas does not ask counsel to approve

- Technical security adequacy (separate independent review — planned, not completed)
- SOC 2, HIPAA, PCI, or regulatory certification
- That `over_21` is legally sufficient for any merchant obligation

---

## 7. Materials provided

| Document | Path |
|----------|------|
| Pilot program charter | `docs/commercial/PILOT_PROGRAM_CHARTER.md` |
| Data responsibility matrix | `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` |
| Third-party inventory | `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md` |
| Consumer terms | `app/legal/terms/page.tsx` |
| Consumer privacy | `app/legal/privacy/page.tsx` |
| Privacy runbook (not legal program) | `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` L3 |
| Partner Flow OpenAPI | `public/openapi/partner-flow.openapi.yaml` |

---

## 8. Requested deliverables from counsel

| Deliverable | Notes |
|-------------|-------|
| Fixed-scope legal memo (age-gated digital commerce claims) | Fee and timeline — **Proposed question** |
| Outline of pilot agreement + DPA (not full MSA) | For **proposed 30-day paid pilot** |
| List of required privacy policy / ToS updates | If any |
| Explicit statement of what Abraxas **cannot** claim | Required |

---

## 9. Explicit non-claims

This brief does not state that Abraxas is compliant, certified, regulatory-grade, or legally approved for age verification in any jurisdiction.
