# Security vendor evaluation scorecard

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · **internal-only** · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `f41f5bad33a277a52606053e6c5cf9535293a8d2` |
| **Last reconciled** | 2026-08-14 |

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by a cited path in this repository. |
| **Operator-filled** | Pipeline and scoring tables below. |
| **Proposed question** | Vendor must answer; not fixed in repo. |
| **Requires external validation** | Deliverable not yet present in repo. |

**No independent security review has occurred.** Abraxas is seeking an independent security review. Independent security review is planned and not yet completed — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3.

**Internal-only.** Organization names only in tables — no personal contact information.

---

## Pipeline (operator-filled)

| Firm name | Source | Status | Next action | Owner | Follow-up | Notes |
|-----------|--------|--------|-------------|-------|-----------|-------|
| | | | | | | |

**RFP reference:** `docs/commercial/SECURITY_REVIEW_RFP_v1.md`

---

## Scoring rubric (1–3)

| Score | Meaning |
|-------|---------|
| 1 | Weak / unclear / misaligned |
| 2 | Adequate |
| 3 | Strong |

### Dimensions

| Dimension | What to assess | Repo reference |
|-----------|----------------|----------------|
| Relevant application-security experience | B2B SaaS / API review depth; comparable engagements | RFP §9 references — `SECURITY_REVIEW_RFP_v1.md` L166 |
| Identity / auth experience | Partner Flow, API keys, sessions, tenant isolation | RFP §4 — L62–75 |
| Methodology | Static, dynamic, manual mix; grey-box vs black-box | RFP §9 — L157 |
| Retest terms | Included window; cutoff for new findings | RFP §9 — L160 |
| Cost | Fixed fee vs T&M; retest line items — **Proposed question** | RFP §9 — L159 |
| Timeline | Kickoff → draft → retest → final — **Proposed question** | RFP §9 — L158 |
| NDA | Mutual NDA before repository access | RFP §9 — L163 |
| Reporting quality | Finding IDs, SHA tested, severity rubric alignment | `docs/external-security-review/REVIEWER_CHECKLIST.md` L50–60; RFP §9 — L161–162 |

**Deliverable path (verified in repo):** `reports/external-security-review/independent-review.md` — `docs/RELEASE_READINESS.md` L18.

**Testing rules (verified in repo):** Default staging/demo; synthetic data only; production requires written authorization — `SECURITY_REVIEW_RFP_v1.md` L93–101.

---

## Evaluation worksheet (operator-filled)

| Firm | AppSec | Identity/auth | Method | Retest | Cost | Timeline | NDA | Reporting | Total / notes | Recommendation |
|------|--------|---------------|--------|--------|------|----------|-----|-----------|---------------|----------------|
| | | | | | | | | | | |

**Recommendation values:** `Proceed` / `Hold` / `Decline` — operator judgment only; not a certification.

---

## Explicit non-claims

- Vendor selection does not constitute a security certification — `SECURITY_REVIEW_RFP_v1.md` L192.
- This scorecard does not imply SOC 2, ISO 27001, HIPAA, PCI DSS, or regulatory approval.
