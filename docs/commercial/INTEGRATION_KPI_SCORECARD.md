# Integration KPI scorecard

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Purpose

Manual operational template to track **beta-stage** design-partner and pilot integration evidence for **age-gated digital commerce**. Metrics here are **not audited** unless separately attested.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Gate status or tooling exists at cited path. |
| **Operator-filled** | Tables below — populate weekly. |
| **Aspirational / requires external validation** | Targets not verified by repo artifacts. |

---

## Release gate snapshot (verified in repo)

From `docs/RELEASE_READINESS.md` (not a release sign-off):

| Gate | Status | Evidence |
|------|--------|----------|
| Human IAT Scenarios A–D | **Pending** | L16; `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` unsigned |
| External security review | **Blocked** | L18; package only — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3 |
| Second relying-party pilot | **Pending** | L19; `docs/SECOND_PARTNER_PILOT_RUNBOOK.md` |
| `v1.0.0-beta.0` tag | **Pending** | L20 |

**Verified in repo:** `npm run release:readiness` does not fail on PENDING/HUMAN_REQUIRED/BLOCKED — `docs/RELEASE_READINESS.md` L41–42.

---

## Weekly scorecard (operator-filled)

### Partner Flow volume

| Week ending | evaluate | complete | refresh | Notes |
|-------------|----------|----------|---------|-------|
| | | | | |

**Data sources:** Partner metering ledger (`lib/partner/partnerMetering.ts`); admin partner-flow health (`app/admin/partner-flow/`).

### Time-to-verify

| Week ending | Median holder time (minutes) | p95 | Sample size | Notes |
|-------------|------------------------------|-----|-------------|-------|
| | | | | |

### Manual review load

| Week ending | Identity queue depth | Approvals | Denials | Notes |
|-------------|----------------------|-----------|---------|-------|
| | | | | |

**Evidence:** `app/admin/identity/page.tsx`; `app/api/admin/identity/queue/route.ts`.

### Receipt and revocation health

| Week ending | Receipts issued | Revocations | Public verify failures | Notes |
|-------------|-----------------|-------------|------------------------|-------|
| | | | | |

**Evidence:** `lib/decisionReceipts/service.ts`; `app/api/receipts/[receiptId]/public/route.ts`.

### Webhook delivery (if enabled)

| Week ending | Delivered | Dead letter | Alert emails sent | Notes |
|-------------|-----------|-------------|-------------------|-------|
| | | | | |

**Evidence:** `docs/PARTNER_WEBHOOKS.md`; webhook alerts are **technical operational signals only** — not a support SLA.

### Pilot progression

| Partner ID | Sandbox key issued | Conformance pass date | Production key | Notes |
|----------|-------------------|----------------------|----------------|-------|
| | | | | |

**Evidence:** `npm run partner:conformance`; `docs/PARTNER_ONBOARDING_CHECKLIST.md`.

---

## Automated companion (verified, not full IAT)

| Run date | Result | Artifact |
|----------|--------|----------|
| 2026-08-06 | 20 PASS, 1 HUMAN_REQUIRED (per release docs) | `reports/iat-automated/iat-automated-2026-08-06*.md` |

**Verified in repo:** Automated companion does not replace human IAT — `docs/IAT_AUTOMATED_COMPANION.md`; `docs/RELEASE_READINESS.md` L57–58.

---

## Leading indicators (aspirational)

From `lib/investorDataRoom.ts` L60+ — **requires external validation**; not populated as verified metrics in this repo:

- Days from asset submission to verified credential
- Credential reuse rate across external queries
- Captured bookings / integration count
- Gross margin (commercial model)

---

## Commands (read-only)

| Command | Purpose |
|---------|---------|
| `npm run release:readiness` | Aggregate gate status |
| `npm run iat:automated` | Automated IAT companion |
| `npm run partner:conformance` | Partner Flow conformance kit |
| `npm run audit:partner-flow-trace -- ft_vr_<id>` | Flow trace correlation |

---

## External next steps

| Action | Owner |
|--------|-------|
| Sign human IAT Scenarios A–D in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` | Operator + founder |
| Complete second relying-party pilot | Operator — `docs/SECOND_PARTNER_PILOT_RUNBOOK.md` |
| Independent security review artifact | Security firm |
