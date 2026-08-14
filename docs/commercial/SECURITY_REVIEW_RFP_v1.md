# Security review RFP v1

| Field | Value |
|-------|-------|
| **Status** | Draft v1 · beta-stage · founder/engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a` |
| **Last reconciled** | 2026-08-13 |

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by a cited path in this repository. |
| **Planned / partial** | Documented but not completed or not operator-confirmed. |
| **Proposed question** | Vendor or operator must answer; not fixed in repo. |
| **Requires external validation** | Independent reviewer deliverable not yet present. |

**No independent security review or penetration test has occurred.** Abraxas is **seeking** an independent security review. Independent security review is **planned and not yet completed** — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3; gate blocked per `docs/RELEASE_READINESS.md` L18.

---

## 1. Purpose

Request proposals from qualified security firms to perform an **independent application security review and/or penetration test** of Abraxas Verify before broader **age-gated digital commerce** pilot onboarding.

This RFP is **not** a certification, audit attestation, or claim that a review has already been performed.

---

## 2. About Abraxas

| Topic | Fact | Evidence |
|-------|------|----------|
| Product | Beta-stage B2B **trust and authorization layer** | `README.md` L7–8 |
| Not a KYC provider | Abraxas orchestrates policy-bound trust decisions; licensed or configured verification paths supply evidence | `README.md` L7–8 |
| Production origin | `https://abraxasworld.xyz` | `docs/RELEASE_READINESS.md` L4 |
| Institutional readiness | L4 **not yet** | `docs/TRUST_MODEL_V1.md` L25 |
| Commercial wedge | **Age-gated digital commerce** (primary pilot scope for this engagement) | `docs/commercial/PILOT_PROGRAM_CHARTER.md`; `lib/complianceGatePositioning.ts` L14–17 |

---

## 3. Current security posture (honest)

| Item | Status | Evidence |
|------|--------|----------|
| Internal STRIDE design review | Exists; **not a pentest** | `docs/SECURITY_THREAT_MODEL.md` L4–5 |
| External reviewer package | Prepared | `docs/external-security-review/` |
| Independent written report | **Missing** | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3 |
| Release gate | **Blocked** until `reports/external-security-review/independent-review.md` | `docs/RELEASE_READINESS.md` L18, L58 |
| Human IAT (Scenarios A–D) | **Pending** | `docs/RELEASE_READINESS.md` L16 |

Abraxas is seeking an independent security review. Independent security review is planned and not yet completed.

---

## 4. In-scope systems and controls

Vendors should assess the following **verified in repo**:

| Area | Scope detail | Primary evidence |
|------|--------------|----------------|
| **Partner Flow** | `evaluate` / `complete` / `refresh` browser-session APIs | `app/api/v1/partner-flow/*`; `public/openapi/partner-flow.openapi.yaml` |
| **Signed decision receipts** | Ed25519 canonical payloads, issuance, verification | `lib/decisionReceipts/signing.ts`; `docs/TRUST_MODEL_V1.md` §3 |
| **Public receipt verification** | Unauthenticated read model; capability URL assumptions | `app/api/receipts/[receiptId]/public/route.ts`; OpenAPI L16 |
| **Revocation** | Credential and receipt invalidation paths | `docs/TRUST_MODEL_V1.md` §10.1–10.2; `lib/decisionReceipts/revocationControlPlane.ts` |
| **Partner APIs & keys** | `abx_*` authentication, scoping, rotation | `docs/SECURITY_THREAT_MODEL.md` §1.2; `lib/partner/partnerAuth.ts` |
| **Admin controls** | Identity review queue, partner onboarding, receipt inspection | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L22 |
| **Privacy paths** | Holder request ledger; admin approval workflow | `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md`; `lib/privacy/privacyControlPlane.ts` |
| **Webhook delivery** | Outbox, HMAC signing, retry, operational alerts | `docs/PARTNER_WEBHOOKS.md` |
| **Rate limiting** | Partner Flow rate limits; identity for limits | `docs/PARTNER_FLOW_RATE_LIMITS.md` |
| **Secret handling** | Signing key, browser session secret, service role, webhook master key | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L51–58; `docs/TRUST_MODEL_V1.md` §3.1 |
| **zkLogin / browser sessions** | OAuth proof, session minting, cookie binding | `docs/external-security-review/REVIEWER_GUIDE.md` |
| **Authentication & authorization** | All routes treating app layer as auth boundary | `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L38–39 |
| **Tenant / partner isolation** | Partner-scoped decisions, API keys, return URL allowlists, sanitization of partner payloads | `lib/partner/partnerVerificationResult.ts` L20–38; `docs/SECURITY_THREAT_MODEL.md` |
| **Unintended data exposure** | IDOR, enumeration, PII leakage via APIs, logs, webhooks, public receipt responses, admin paths | `docs/SECURITY_THREAT_MODEL.md` L23–24; `BETA_LIMITATIONS_AND_SCOPE.md` L15–16 |

### Data-exposure assessment (explicitly in scope)

The vendor **must** assess authentication, authorization, tenant/partner isolation, access-control, and **unintended data-exposure paths** — including whether holder PII, document metadata, or partner-scoped data can be read or inferred across trust boundaries.

This includes but is not limited to:

- Holder status and credential enumeration risks — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L15–16
- Public and partner-authenticated receipt/decision endpoints
- Admin and IDV routes — including `POST /api/idv/sync-decision` (unauthenticated in current code) — `BETA_LIMITATIONS_AND_SCOPE.md` L22
- Webhook payloads and alert content — metadata-only contract per `docs/PARTNER_WEBHOOKS.md` L94
- Service-role concentration and application-layer authorization — `BETA_LIMITATIONS_AND_SCOPE.md` L38–39

**Do not** treat PII or data-exposure risk as out of scope. Vendor platform security (Supabase/Vercel/Google/Veriff **platforms**) remains vendor responsibility; **Abraxas usage patterns and application-layer exposure** are in scope.

---

## 5. Testing environment and data rules

| Rule | Requirement |
|------|-------------|
| **Default environment** | Controlled **staging / demo** environment. Demo operator docs: `docs/demo/DEMO_ENVIRONMENT_RUNBOOK.md`. |
| **Production testing** | Requires **separate written authorization**, agreed rules of engagement, and a defined testing window from Abraxas operator. **Proposed question:** vendor to propose RoE template. |
| **Test data** | Abraxas will provide **synthetic / test data only**. **No real holder PII** may be used in testing, screenshots, or the final report. |
| **Report content** | No API keys, session cookies, signing material, or holder PII — per `docs/external-security-review/REVIEWER_CHECKLIST.md` L29 |
| **Live probes** | Read-only HTTP probes acceptable on authorized environment; no bulk export — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L68 |

---

## 6. Out of scope (default unless separately contracted)

From `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L53–68:

| Area | Reason |
|------|--------|
| Sui Move passport contracts | Separate on-chain audit surface — `sui/abraxas_passport/` |
| MoonPay / unrelated marketplace UI | Not Verify trust infrastructure |
| **Vendor platform security** (Supabase, Vercel, Google, Veriff platforms) | Review **integration and usage** only |
| Social engineering / physical access | Standard exclusion |
| Load / DDoS | Coordinate separately; not default |
| **Cannabis-specific consumer UI** | Out of initial commercial/legal scope; assess Partner Flow **APIs and receipts** only if encountered in staging |

**Not out of scope:** application-layer PII exposure, partner isolation failures, authorization bypass, or unintended disclosure through Abraxas APIs.

---

## 7. Known beta limitations (disclose to vendor)

Honest list from `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md`:

| Category | Limitation |
|----------|------------|
| Auth / sessions | Admin auth fragmentation; session secret fallback; credential/status enumeration |
| IDV | Public `POST /api/idv/sync-decision` without authentication |
| Partner Flow | Migration rollout (053/054) may vary by environment; audit best-effort on some error paths |
| Infrastructure | Service role concentration; RLS not relied on for app auth; no in-repo WAF doc |
| Evidence | No in-repo pentest report; E2E holder flow not in CI; IAT may lag code |

Vendors should **retest** documented gaps and note whether they remain exploitable.

---

## 8. Deliverables requested

| # | Deliverable |
|---|-------------|
| 1 | Written report (PDF + editable format) with executive summary and technical findings |
| 2 | Findings mapped to severity rubric — `docs/external-security-review/REVIEWER_CHECKLIST.md` L50–60 |
| 3 | Per-finding: component, STRIDE category, reproduction, impact, partner-impact lens — L62, L66–83 |
| 4 | Exact repository commit SHA and environment URL tested |
| 5 | Retest of Critical/High findings after operator remediation — **Proposed question:** included hours and window |
| 6 | Disposition table template for operator (Fixed / Accepted / Deferred) |

Gate completion per `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L67–75 requires written report and documented disposition.

---

## 9. Vendor proposal questions

| Topic | Abraxas asks vendor to specify |
|-------|-------------------------------|
| **Methodology** | Static analysis, dynamic testing, manual review; grey-box vs black-box mix |
| **Timeline** | Kickoff → draft → remediation retest → final — **Proposed question** |
| **Price range** | Fixed fee vs T&M; line items for retest — **Proposed question** |
| **Retest terms** | Included retest window; cutoff for new findings — **Proposed question** |
| **Severity definitions** | Alignment with `REVIEWER_CHECKLIST.md` rubric or CVSS mapping |
| **Report format** | Finding IDs, SHA reviewed, evidence references |
| **NDA** | Mutual NDA required before repository access |
| **Team** | Lead reviewer qualifications; dedicated retest engineer |
| **Production testing** | Process if vendor requests prod; Abraxas default is staging/demo only |
| **References** | Two comparable B2B SaaS / identity-trust reviews — **Proposed question** |

---

## 10. Materials provided to vendor

| Material | Path |
|----------|------|
| Reviewer package index | `docs/external-security-review/README.md` |
| Reviewer guide | `docs/external-security-review/REVIEWER_GUIDE.md` |
| Threat model evidence matrix | `docs/external-security-review/THREAT_MODEL_EVIDENCE_MATRIX.md` |
| Repro commands | `docs/external-security-review/REPRO_COMMANDS.md` |
| Beta limitations & scope | `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` |
| Reviewer checklist | `docs/external-security-review/REVIEWER_CHECKLIST.md` |
| STRIDE threat model | `docs/SECURITY_THREAT_MODEL.md` |
| Trust Model v1 | `docs/TRUST_MODEL_V1.md` |
| Commercial security overview | `docs/commercial/ENTERPRISE_SECURITY_OVERVIEW_v1.md` |
| Third-party service inventory | `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md` |
| Data responsibility matrix | `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` |

---

## 11. Explicit non-claims

- Abraxas has **not** completed an independent security review or penetration test.
- This RFP does **not** imply SOC 2, ISO 27001, HIPAA, PCI DSS, or regulatory approval.
- Vendor selection does **not** constitute a security certification.

---

## 12. Submission

| Field | Value |
|-------|-------|
| Contact | **Proposed target:** `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64 |
| Response format | PDF proposal + optional call |
| Questions deadline | **Proposed target** |
| Proposal deadline | **Proposed target** |
