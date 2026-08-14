# Outreach pipeline template

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · **internal-only** · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `f41f5bad33a277a52606053e6c5cf9535293a8d2` |
| **Last reconciled** | 2026-08-14 |

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by a cited path in this repository. |
| **Operator-filled** | Tables below — populate as outreach progresses. |
| **Requires external validation** | Depends on third-party response, conflicts clearance, or signed evidence not in repo. |

**Internal-only.** Do not distribute externally. Do not store personal contact information, individual names, emails, phone numbers, or scraped prospect lists in this repository — use operator CRM outside git.

---

## Purpose

Track three beta-stage outreach lanes in one place:

| Lane | Scorecard |
|------|-----------|
| Security vendors (independent review) | [SECURITY_VENDOR_EVALUATION_SCORECARD.md](./SECURITY_VENDOR_EVALUATION_SCORECARD.md) |
| Counsel (age-gated commerce memo + pilot docs) | [COUNSEL_EVALUATION_SCORECARD.md](./COUNSEL_EVALUATION_SCORECARD.md) |
| Pilot prospects (proposed 30-day paid pilot) | [PILOT_PROSPECT_EVALUATION_SCORECARD.md](./PILOT_PROSPECT_EVALUATION_SCORECARD.md) |

**Verified in repo:** Independent security review is **blocked** until `reports/external-security-review/independent-review.md` exists — `docs/RELEASE_READINESS.md` L18. Second relying-party pilot **pending** — L19.

---

## Shared pipeline columns

Use these columns in each lane scorecard:

| Column | Guidance |
|--------|----------|
| Company / firm name | Organization name only — no individual PII |
| Source | e.g. inbound, referral, conference, RFP response, research |
| Status | Lane-specific enum below |
| Next action | Operator-written |
| Owner | Founder / Operator / Engineering |
| Follow-up date | ISO date (`YYYY-MM-DD`) |
| Notes | Free text — no contact details |

---

## Status enums

### Security vendors

`Identified` → `Outreach sent` → `NDA pending` → `Proposal received` → `Evaluating` → `Selected` / `Declined` / `On hold`

### Counsel

`Identified` → `Outreach sent` → `Conflicts check` → `Proposal received` → `Engaged` / `Declined` / `On hold`

### Pilot prospects

`Identified` → `Discovery scheduled` → `Discovery complete` → `Technical review` → `Proposed pilot` → `Counsel review` → `Pilot agreed` / `Declined` / `On hold`

`Pilot agreed` means counsel-approved terms are in progress or signed — **requires external validation**. Nothing in this template implies a signed pilot exists in repo.

---

## Master summary (operator-filled)

| Lane | Company / firm | Status | Owner | Follow-up | Notes |
|------|----------------|--------|-------|-----------|-------|
| Security | | | | | |
| Counsel | | | | | |
| Pilot | | | | | |

---

## Weekly operator checklist

| Step | Action |
|------|--------|
| 1 | Review follow-up dates across all three lanes |
| 2 | Update lane scorecards after calls or proposals |
| 3 | When a pilot advances, track integration KPIs in `docs/commercial/INTEGRATION_KPI_SCORECARD.md` |
| 4 | Do not record personal contact data in git |

---

## Explicit non-claims

- No audit, certification, compliance approval, signed pilot, fixed pricing, or SLA is implied by any status value.
- **Proposed 30-day paid pilot** language only — pricing and terms require mutual agreement and counsel-approved documents — `docs/commercial/PAID_PILOT_ONE_PAGER.md` L11–13.
- Cannabis is **secondary / future** — not the initial pilot wedge — `docs/commercial/PILOT_PROGRAM_CHARTER.md` L43–48.
