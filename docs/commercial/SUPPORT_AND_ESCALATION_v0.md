# Support and escalation v0

| Field | Value |
|-------|-------|
| **Status** | Draft v0 · beta-stage · engineering-owned · **not legal advice** · **not a customer contract** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Founder-operated beta (required)

**Current support and incident escalation are founder-operated beta processes.**

There is no staffed 24/7 support organization, ticketing platform, or contractual response commitment documented in this repository.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Cited intake channel or tooling. |
| **Internal beta objective** | Target response time — not a guarantee. |
| **Planned** | Role or system not yet implemented. |

---

## Scope

This document covers **beta-stage** support for:

- Design-partner and pilot integrators (primary: age-gated digital commerce)
- Security vulnerability reports
- Operational signals from Partner Flow webhooks

It does **not** define holder support SLAs or regulatory breach notification obligations.

---

## Intake channels (verified in repo)

| Channel | Evidence | Notes |
|---------|----------|-------|
| Design partner application | `app/integrations/`; `app/api/integrations/apply/route.ts` | Primary B2B intake |
| Design partner hub | `app/design-partner/page.tsx` | Onboarding path and checklist links |
| Security reports | `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64 | Bug bounty pre-registration scope — L61–77 |
| Contact form | `components/ContactForm.tsx`; `app/api/contact/submit/route.ts` | Generic; legal pages reference "contact form on our website" — `app/legal/privacy/page.tsx` L123–124 |
| Webhook alert emails | `docs/PARTNER_WEBHOOKS.md`; `lib/notify/adminResend.ts` | See **Technical operational signals** below |

**Missing (verified by absence):** dedicated `support@` or `integrations@` alias in repo; ticketing system; support portal.

---

## Technical operational signals (webhook alerts)

Partner webhook alert emails are **technical operational signals only**:

- Triggered when webhook dispatch health thresholds are met and `PARTNER_WEBHOOK_ALERTS_ENABLED=true` with Resend configured — `docs/PARTNER_WEBHOOKS.md` L20–21, L84+
- Delivered to `ABRAXAS_ADMIN_EMAILS` via `lib/notify/adminResend.ts`
- Contain **metadata only** per webhook alert contract — no holder PII

They are **not**:

- A complete support bridge for integrators or holders
- A guaranteed response or escalation system
- A substitute for integrator monitoring of their own endpoints

---

## Escalation tiers (internal beta objectives)

**Not contractual.** Not historical performance. Not a guarantee or service-credit commitment.

| Tier | Example | Internal beta objective (first response) | Owner |
|------|---------|------------------------------------------|-------|
| **P0** | Suspected signing key compromise; active receipt forgery | 1 hour (business hours; best effort otherwise) | Founder + engineering |
| **P1** | Partner Flow widespread failure | 4 business hours | Engineering |
| **P2** | Single-partner integration blocker | 1 business day | Founder |
| **P3** | General integration question | 2 business days | Founder |
| **Security** | Vulnerability report | Per bounty tiers — `lib/securityProgram.ts` L91–98 (researcher-facing) | Founder |

For security incidents, also follow `docs/commercial/INCIDENT_RESPONSE_PLAN_v0.md`.

---

## Design-partner application review

**Internal beta objective:** review applications within 48 hours — `app/design-partner/page.tsx` L75; similar copy in `components/BecomeAPartner.tsx` L220.

**Verified in repo:** No ops evidence or staffing model for this target. Treat as **internal beta objective only**.

---

## Holder (Passport) support

| Item | Status |
|------|--------|
| Passport UI "contact support" copy | Present — e.g. `components/passport/PassportDashboard.tsx` (informal text) |
| Dedicated holder workflow | **Missing** |
| Privacy requests | Holder-initiated via `components/passport/PassportPrivacyCenter.tsx` — operator/admin fulfillment |

---

## Staffing gaps (verified)

| Role | Status | Evidence |
|------|--------|----------|
| Design partner success | **Planned** | `lib/teamProfile.ts` PLANNED_ROLES — "First external relying party signed" |
| Security engineer | **Planned** — "Post audit" | `lib/teamProfile.ts` L39–42 |
| Compliance counsel | **Active search** (fractional) | `lib/teamProfile.ts` L29–31 |

---

## External next steps

| Action | Owner |
|--------|-------|
| Create `support@` / `integrations@` aliases | Founder |
| Select ticketing system | Founder |
| Support terms in pilot agreement | Counsel |
| Post-audit security triage staffing | Founder |
