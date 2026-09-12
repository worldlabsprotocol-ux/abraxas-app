# Security vendor send package

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · founder-owned · **not legal advice** · **internal send aid** |
| **Base** | `origin/main` at `cd34f90029458f95ab4275e736576e9a64cc4c03` |
| **Last reconciled** | 2026-08-14 |

**Use this page to send real outreach this week.** Customize bracketed fields.

**Do not** claim Abraxas has completed an independent security review, penetration test, audit, certification, or compliance approval.

**Verified in repo:** No independent security review has occurred — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3; release gate blocked — `docs/RELEASE_READINESS.md` L18.

---

## Subject line options

1. `Independent security review proposal — beta B2B trust platform (age-gated commerce)`
2. `Scoped appsec / pentest request — Abraxas Verify (reviewer package ready)`
3. `Security review RFP — no prior independent review; staging/demo default`

---

## Copy/paste email (~150 words)

```
Hi [Name / Team],

I'm [Founder Name], founder of Abraxas (World Labs Protocol). We operate a
beta-stage B2B trust and authorization layer for age-gated digital commerce
pilots — not a KYC provider. A holder can complete Abraxas's available
verification flow. Partners receive policy-bound eligibility decisions and
signed decision receipts their backends can verify server-side.

We have prepared an internal reviewer package (architecture docs, STRIDE threat
model, reproducible verification commands), but no independent security review
or penetration test has been completed. Abraxas is seeking an independent
application security review before onboarding additional relying-party pilots.

Default testing is controlled staging/demo with synthetic data only. Production
testing requires separate written authorization and agreed rules of engagement.

Please send a scoped proposal covering price, timeline, methodology, retest
terms, relevant identity/API-trust experience, your NDA process, and a sample
redacted report. I can share our short RFP now or upon request.

Thank you,
[Founder Name]
[Title]
security@worldlabsprotocol.com
```

**Verified in repo:** `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64.

---

## What Abraxas is (plain English)

Abraxas is a **beta-stage trust and authorization layer**, not a KYC provider — `README.md` L7–8.

A holder can complete Abraxas's available verification flow. Partners receive policy-bound eligibility decisions and signed decision receipts their backends can verify server-side. Merchants and platforms integrate **Partner Flow** to evaluate holder eligibility against published policy rules.

Primary near-term wedge: **age-gated digital commerce** pilots — `docs/commercial/PILOT_PROGRAM_CHARTER.md`.

**Honest status:** An internal STRIDE design review exists; it is **not** a penetration test — `docs/SECURITY_THREAT_MODEL.md` L4–5. **No independent written security review has occurred** — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3.

---

## Review scope (send this list)

Ask the firm to assess **application-layer** security for:

| Area | What to review |
|------|----------------|
| **APIs** | Partner Flow `evaluate` / `complete` / `refresh`; public receipt verification — `public/openapi/partner-flow.openapi.yaml` |
| **Partner authorization** | Authentication, authorization, tenant/partner isolation, access control — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L38–39 |
| **Signed decision receipts** | Ed25519 issuance, canonical payloads, verification — `lib/decisionReceipts/signing.ts`; `docs/TRUST_MODEL_V1.md` §3 |
| **Revocation** | Credential and receipt invalidation — `docs/TRUST_MODEL_V1.md` §10.1–10.2 |
| **Admin access** | Identity review queue, partner onboarding, receipt inspection — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L22 |
| **API keys** | `abx_*` partner keys: scoping, rotation, misuse — `lib/partner/partnerAuth.ts` |
| **Webhooks** | Outbox, HMAC signing, retry, payload boundaries — `docs/PARTNER_WEBHOOKS.md` |
| **Rate limits** | Partner Flow rate limiting — `docs/PARTNER_FLOW_RATE_LIMITS.md` |
| **Privacy / data-exposure paths** | Unintended PII or cross-tenant disclosure via APIs, logs, webhooks, public receipts, admin paths — explicitly in scope — `docs/commercial/SECURITY_REVIEW_RFP_v1.md` L77–89 |
| **Secret handling** | Signing key, browser session secret, service role, webhook master key — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L51–58 |

**Default out of scope unless separately agreed:** vendor platform security (Supabase/Vercel/Google/Veriff platforms), on-chain Move contracts, load/DDoS — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` L53–68.

---

## Testing rules (include in every send)

| Rule | Requirement |
|------|-------------|
| **Default environment** | Controlled **staging / demo** only — `docs/demo/DEMO_ENVIRONMENT_RUNBOOK.md` |
| **Test data** | **Synthetic / test data only** — no real holder PII in testing, screenshots, or reports |
| **Production testing** | Requires **separate written authorization**, agreed **rules of engagement**, and a defined testing window |
| **Report content** | No API keys, session cookies, signing material, or holder PII — `docs/external-security-review/REVIEWER_CHECKLIST.md` L29 |

---

## Questions to ask every vendor

| # | Question |
|---|----------|
| 1 | **Price** — fixed fee vs T&M; line items for remediation retest |
| 2 | **Timeline** — kickoff → draft report → retest → final |
| 3 | **Methodology** — static, dynamic, manual; grey-box vs black-box mix |
| 4 | **Retest terms** — included window; cutoff for new findings after draft |
| 5 | **Identity / API-trust experience** — comparable B2B SaaS, auth, tenant isolation, or trust-infrastructure reviews |
| 6 | **NDA process** — mutual NDA required before repository access |
| 7 | **Sample redacted report** — example deliverable format and severity rubric alignment |

Track responses in `docs/commercial/SECURITY_VENDOR_EVALUATION_SCORECARD.md`.

---

## Attachments / links checklist

### May include in initial outreach (before NDA)

| # | Item | Path |
|---|------|------|
| 1 | Short RFP | `docs/commercial/SECURITY_REVIEW_RFP_v1.md` — attach or offer upon request |
| 2 | Gate status (honest) | `docs/RELEASE_READINESS.md` L18 |
| 3 | Package index (top-level) | `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` |

### Provide only after mutual NDA

| # | Item | Path |
|---|------|------|
| 4 | Reviewer package index | `docs/external-security-review/README.md` |
| 5 | Reviewer guide | `docs/external-security-review/REVIEWER_GUIDE.md` |
| 6 | Beta limitations & scope | `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` |
| 7 | Repro commands | `docs/external-security-review/REPRO_COMMANDS.md` |
| 8 | Reviewer checklist (severity rubric) | `docs/external-security-review/REVIEWER_CHECKLIST.md` |
| 9 | Threat model evidence matrix | `docs/external-security-review/THREAT_MODEL_EVIDENCE_MATRIX.md` |
| 10 | STRIDE threat model | `docs/SECURITY_THREAT_MODEL.md` |
| 11 | Trust Model v1 | `docs/TRUST_MODEL_V1.md` |
| 12 | Commercial security overview | `docs/commercial/ENTERPRISE_SECURITY_OVERVIEW_v1.md` |
| 13 | Repository access, test credentials, staging/demo environment details | Operator-provided after NDA — `docs/demo/DEMO_ENVIRONMENT_RUNBOOK.md` |

**Before sending:**
- [ ] Short RFP attached or offered; detailed reviewer materials held until NDA
- [ ] Vendor accepts staging/demo + synthetic data default
- [ ] Log firm name only in `docs/commercial/SECURITY_VENDOR_EVALUATION_SCORECARD.md` (no personal contact data in git)
- [ ] Do **not** say “audited,” “certified,” “compliant,” or “security review in progress”

---

## Explicit non-claims

- Abraxas has **not** completed an independent security review or penetration test.
- This package does **not** imply SOC 2, ISO 27001, HIPAA, PCI DSS, or regulatory approval.
- Vendor selection does **not** constitute a security certification — `docs/commercial/SECURITY_REVIEW_RFP_v1.md` L192.
