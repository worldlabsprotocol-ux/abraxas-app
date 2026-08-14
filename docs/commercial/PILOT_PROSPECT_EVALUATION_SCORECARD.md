# Pilot prospect evaluation scorecard

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
| **Proposed question** | Qualification answer not in repo. |
| **Requires external validation** | Jurisdiction analysis, signed pilot evidence. |

**Internal-only.** Company names only in tables — no personal contact information.

**Proposed 30-day paid pilot:** not a binding offer. Pricing, scope, support commitments, and contract terms require mutual agreement and counsel-approved documents — `docs/commercial/PAID_PILOT_ONE_PAGER.md` L11–13.

---

## Pipeline (operator-filled)

| Company | Source | Status | Next action | Owner | Follow-up | Notes |
|---------|--------|--------|-------------|-------|-----------|-------|
| | | | | | | |

**Discovery reference:** `docs/commercial/PAID_PILOT_DISCOVERY_CALL_SCRIPT.md`

---

## Ideal profile (verified in repo)

| Attribute | Evidence |
|-----------|----------|
| Use case | Age-gated digital commerce — `docs/commercial/PILOT_PROGRAM_CHARTER.md` L31–37 |
| Integration model | Partner Flow + server-side receipt verification — L56–66 |
| Cannabis | Secondary / future — not initial pilot wedge — L43–48 |
| Second RP pilot | Org-level gate **pending** — `docs/RELEASE_READINESS.md` L19 |

---

## Scoring rubric (1–3)

| Score | Meaning |
|-------|---------|
| 1 | Weak fit |
| 2 | Possible fit |
| 3 | Strong fit |

### Dimensions

| Dimension | What to assess | Repo reference |
|-----------|----------------|----------------|
| Actual age-gate friction | Repeat uploads, drop-off at gate | Discovery §A — `PAID_PILOT_DISCOVERY_CALL_SCRIPT.md` L50–56; `lib/complianceGatePositioning.ts` L8–9 |
| Buyer access | Product, engineering, legal involvement in pilot decision | Discovery §F — L91–97 |
| Integration readiness | HTTPS APIs, server-side receipt verify, engineering owner | Discovery §E — L83–89; charter L56–66 |
| Jurisdiction complexity | States/countries, 18+ vs 21+ by SKU — **Requires external validation** (counsel) | Discovery §D — L73–80 |
| Decision timeline | Target staging/production date — **Proposed question** | Discovery §F — L96 |
| Pilot value | Time-to-verify, conversion, manual review hours saved | Charter L81–89; `docs/commercial/INTEGRATION_KPI_SCORECARD.md` |
| Willingness to sign | Accepts beta terms; counsel-approved agreement path | One-pager L11–13; `docs/commercial/BETA_SERVICE_LEVEL_APPENDIX.md` (no contractual SLA) |

---

## Evaluation worksheet (operator-filled)

| Company | Friction | Buyer | Integration | Jurisdiction | Timeline | Value | Willing to sign | Total / notes | Fit |
|---------|----------|-------|-------------|--------------|----------|-------|-----------------|---------------|-----|
| | | | | | | | | | |

**Fit values:** `Strong` / `Maybe` / `Defer` — operator judgment only.

---

## Disqualifiers (internal)

From `PAID_PILOT_DISCOVERY_CALL_SCRIPT.md` L143–150:

| Signal | Action |
|--------|--------|
| Requires certified age verification or DOB extraction today | Defer — **Requires external validation** |
| Needs cannabis-specific legal clearance as first pilot | Defer — not initial scope |
| Expects SOC 2 / PCI attestation now | Explain gap honestly |
| No engineering owner for server-side receipt verification | Revisit after resourcing |

---

## Explicit non-claims

- No signed pilot, fixed pricing, SLA, compliance guarantee, or certification is implied by any score or status.
- `over_21` is policy-derived, not DOB-extracted, and not legal sufficiency — `lib/partner/partnerVerificationResult.ts` L65–66; `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` L71–73.
