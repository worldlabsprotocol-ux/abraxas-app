# Commercial readiness gap assessment

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** · **not a compliance or certification statement** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Scope and methodology

This assessment compares the Abraxas repository (code and `docs/`) against eleven commercial requirement areas for **beta-stage** sales to **age-gated digital commerce** integrators. It is a **gap analysis only**:

- No external penetration test, legal review, or insurance verification was performed for this document.
- **Technical controls built** are separated from **independent validation** and **legal obligations not yet complete**.

**Commercial wedge:** age-gated digital commerce first. Cannabis is secondary/future. Gaming/wagering, financial services, and tokenized assets are out of scope.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Cited path at base SHA. |
| **Planned / partial** | Started but incomplete. |
| **Missing** | Not found in repo. |
| **Requires external validation** | Third party or signed evidence required. |

**Prohibited claims:** commercial-ready, enterprise-ready, compliant, certified, regulatory-grade, audit-ready, SOC 2, HIPAA, PCI DSS, legal approval.

---

## Executive summary

| # | Category | Built (verified) | Gap | Risk (engineering view) | Priority |
|---|----------|------------------|-----|-------------------------|----------|
| 1 | Independent security review | Reviewer package, threat models, audit scripts | No pentest/report | High | Now |
| 2 | Privacy / retention / deletion | Request ledger, runbooks, limitations doc | No PIA; no automated purge | High | Now |
| 3 | Legal / market analysis | Consumer ToS/privacy; policy `minimum_age` | No market memo; `over_21` not DOB-derived | High | Now |
| 4 | Incident response / DR | Trust-model playbooks | No formal IR/DR/BCP doc | High | Next 30 days |
| 5 | SLA / availability | Status API, health panels | No customer SLA | Medium | Next 30 days |
| 6 | Support / escalation | Apply flow, security@, contact form | No ticketing; founder-operated | Medium | Next 30 days |
| 7 | Design-partner / pilot | Charter, outreach, onboarding docs | No signed pilot terms; 2nd RP pending | Medium | Now |
| 8 | Integration KPIs | Gate matrix, metering, automated IAT companion | Human IAT unsigned | High | Now |
| 9 | Biometric / KYC boundaries | IDV provider switch; data matrix draft | Dual-path messaging gap | High | Now |
| 10 | Insurance | — | No corporate cyber/E&O in repo | High | Next 30 days |
| 11 | Enterprise contract pack | Consumer legal pages | No MSA/DPA/subprocessor annex | Critical | Now |

---

## 1. Independent penetration testing and security-review readiness

| | |
|-|-|
| **Already has (verified)** | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md`; `docs/external-security-review/*`; `docs/SECURITY_THREAT_MODEL.md`; `docs/TRUST_MODEL_V1.md`; `npm run audit:production`, `gate:preflight`, `iat:automated`, `release:readiness`; `/security` + `lib/securityProgram.ts` audit tracker |
| **Missing** | `reports/external-security-review/independent-review.md`; audit tracker items non-complete |
| **Risk** | High |
| **Owner** | Security firm + founder (scope) + engineering (remediation) |
| **Smallest next action** | Engage reviewer using `docs/external-security-review/REVIEWER_GUIDE.md` |
| **Priority** | Now |

**Verified in repo:** "no independent security review has occurred" — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3.

---

## 2. Privacy impact assessment and data-retention/deletion policies

| | |
|-|-|
| **Already has (verified)** | `app/legal/privacy/page.tsx`; `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` (not a legal program — L3); `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md`; `lib/privacy/privacyControlPlane.ts`; migrations `060`–`061` |
| **Missing** | PIA; automated blob purge; automated DSAR export; retention enforcement cron |
| **Risk** | High for age-gated / biometric paths |
| **Owner** | Counsel (PIA, policy) + engineering (purge — planned) |
| **Smallest next action** | Counsel drafts PIA using `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` as technical input |
| **Priority** | Now |

---

## 3. Legal/compliance analysis — age-gated commerce wedge

| | |
|-|-|
| **Already has (verified)** | `app/legal/terms/page.tsx` (18+, acceptable use); `lib/complianceGatePositioning.ts`; Partner policy `minimum_age` — `lib/policy/types.ts`; `over_21` derivation — `lib/partner/partnerVerificationResult.ts` L65–66 |
| **Missing** | Market-specific legal memo; standalone AUP; cannabis legal pack |
| **Risk** | High — `over_21` is **not** DOB-derived (`docs/VERIFICATION_V1_AUDIT.md` L98); not compliance-approved |
| **Owner** | Counsel + founder |
| **Smallest next action** | Counsel memo: sellable claims for age-gated digital commerce |
| **Priority** | Now (age-gated); Later (cannabis) |

---

## 4. Incident response and disaster recovery

| | |
|-|-|
| **Already has (verified)** | Recovery procedures — `docs/TRUST_MODEL_V1.md` §10; webhook runbook — `docs/PARTNER_WEBHOOKS.md`; kill-switch policy copy — `app/security/page.tsx` |
| **Missing** | Formal IR plan (this folder adds draft `INCIDENT_RESPONSE_PLAN_v0.md`); DR/BCP; backup restore runbook |
| **Risk** | High |
| **Owner** | Founder + engineering |
| **Smallest next action** | Adopt and exercise `docs/commercial/INCIDENT_RESPONSE_PLAN_v0.md` internally |
| **Priority** | Next 30 days |

---

## 5. Service-level commitments and availability targets

| | |
|-|-|
| **Already has (verified)** | `app/api/protocol/status/route.ts`; `app/status/page.tsx`; researcher SLAs in `lib/securityProgram.ts` (bug bounty only) |
| **Missing** | Customer-facing SLA; uptime contractual commitments |
| **Risk** | Medium |
| **Owner** | Founder + engineering (feasibility) |
| **Smallest next action** | Use `docs/commercial/BETA_SERVICE_LEVEL_APPENDIX.md` for pilot conversations (non-contractual) |
| **Priority** | Next 30 days |

---

## 6. Customer support and escalation process

| | |
|-|-|
| **Already has (verified)** | `app/integrations/`; `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64; `components/ContactForm.tsx` |
| **Missing** | Support aliases, ticketing, escalation matrix, staffed partner success |
| **Risk** | Medium |
| **Owner** | Founder |
| **Smallest next action** | `docs/commercial/SUPPORT_AND_ESCALATION_v0.md` — founder-operated beta processes |
| **Priority** | Next 30 days |

**Verified in repo:** Security engineer role "Post audit" — `lib/teamProfile.ts` L39–42.

---

## 7. Design-partner / paid-pilot program

| | |
|-|-|
| **Already has (verified)** | `app/design-partner/page.tsx`; `lib/designPartnerOutreach.ts`; `docs/PARTNER_ONBOARDING_CHECKLIST.md`; `docs/SECOND_PARTNER_PILOT_RUNBOOK.md`; `docs/commercial/PILOT_PROGRAM_CHARTER.md` |
| **Missing** | Paid pilot agreement; pricing; second RP signed evidence |
| **Risk** | Medium |
| **Owner** | Founder + counsel |
| **Smallest next action** | Run pilot per charter; track KPIs in scorecard |
| **Priority** | Now |

**Verified in repo:** Second relying-party pilot **pending** — `docs/RELEASE_READINESS.md` L19.

---

## 8. Integration-volume evidence and KPIs

| | |
|-|-|
| **Already has (verified)** | `docs/BETA_GATE_EVIDENCE.md`; `lib/partner/partnerMetering.ts`; `reports/iat-automated/`; `docs/commercial/INTEGRATION_KPI_SCORECARD.md` |
| **Missing** | Signed human IAT; populated commercial dashboard; verified leading indicators |
| **Risk** | High for diligence narratives |
| **Owner** | Founder + operator |
| **Smallest next action** | Execute Scenarios A–D — `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |
| **Priority** | Now |

---

## 9. Ownership boundaries — biometric / KYC vendors and Abraxas

| | |
|-|-|
| **Already has (verified)** | Not a KYC provider — `README.md` L7–8; default `manual` IDV — `lib/idv/idvProvider.ts`; comparison — `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` |
| **Missing** | Counsel-approved controller/processor matrix; privacy policy alignment for native capture |
| **Risk** | High |
| **Owner** | Counsel + operator (prod path confirmation) |
| **Smallest next action** | Confirm production `IDV_PROVIDER`; provide matrix to counsel |
| **Priority** | Now |

---

## 10. Cyber, technology E&O, and privacy insurance readiness

| | |
|-|-|
| **Already has (verified)** | Asset-level insurance in case studies only — e.g. `lib/cieloCaseStudy.ts` (property context) |
| **Missing** | Corporate cyber/E&O/privacy insurance documentation |
| **Risk** | High for larger pilots |
| **Owner** | Insurance broker + founder |
| **Smallest next action** | Broker intake using `docs/commercial/ENTERPRISE_SECURITY_OVERVIEW_v1.md` |
| **Priority** | Next 30 days |

---

## 11. Enterprise contract package

| | |
|-|-|
| **Already has (verified)** | Consumer `app/legal/terms/page.tsx`, `app/legal/privacy/page.tsx`; technical security page `app/security/page.tsx` |
| **Missing** | MSA, DPA, pilot agreement, subprocessor annex, security questionnaire responses |
| **Risk** | Critical |
| **Owner** | Counsel |
| **Smallest next action** | Counsel drafts from `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md` (not a legal annex) |
| **Priority** | Now |

---

## Technical strengths (verified, beta-stage)

| Area | Evidence |
|------|----------|
| Partner Flow + signed receipts | `lib/partner/relyingPartyFlow.ts`; `lib/decisionReceipts/signing.ts` |
| Current partner-output sanitizer designed to exclude raw DOB in partner responses | `lib/partner/partnerVerificationResult.ts` |
| Operator tooling | `lib/admin/partnerOnboardingConsole.ts`; `app/admin/partner-flow/` |
| Honest gate documentation | `docs/RELEASE_READINESS.md`; `docs/INTEGRATION_READINESS_RECONCILIATION.md` |
| Privacy request infrastructure | `lib/privacy/privacyControlPlane.ts` |

These reduce engineering work but **do not** replace external validation or counsel-owned contracts.

---

## Engineering documentation delivered (this folder)

| File | Role |
|------|------|
| `docs/commercial/README.md` | Index |
| `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md` | Provider inventory (not legal classification) |
| `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` | Technical flows |
| `docs/commercial/INTEGRATION_KPI_SCORECARD.md` | Operator metrics template |
| `docs/commercial/PILOT_PROGRAM_CHARTER.md` | Beta pilot structure |
| `docs/commercial/ENTERPRISE_SECURITY_OVERVIEW_v1.md` | Diligence technical overview |
| `docs/commercial/SUPPORT_AND_ESCALATION_v0.md` | Founder-operated support draft |
| `docs/commercial/BETA_SERVICE_LEVEL_APPENDIX.md` | Non-contractual beta objectives |
| `docs/commercial/INCIDENT_RESPONSE_PLAN_v0.md` | Internal IR draft |

---

## External next steps (not in this folder)

| Deliverable | Owner |
|-------------|-------|
| MSA, DPA, pilot agreement | Counsel |
| Legal memos (age-gated, cannabis) | Counsel |
| PIA, standalone AUP | Counsel |
| Insurance / COI | Insurance broker |
| `reports/external-security-review/independent-review.md` | Security firm |

---

## Explicit non-claims

Abraxas is **beta-stage**. This repository documents pending gates (`docs/RELEASE_READINESS.md`). Nothing in this assessment states SOC 2, HIPAA, PCI, regulatory approval, or that `over_21` is legally sufficient for any merchant obligation.
