# External Security Review — Package (beta)

**Status:** Readiness package prepared — **no independent security review has occurred** in this repository.  
**Baseline:** `origin/main` after PR #114 (Partner Flow observability / audit evidence).  
**Canonical handoff:** [`docs/external-security-review/`](./external-security-review/README.md)

---

## Quick start for reviewers

1. Read the [package index](./external-security-review/README.md) (includes disclaimer).
2. Follow the [Reviewer Guide](./external-security-review/REVIEWER_GUIDE.md) for architecture and trust boundaries.
3. Run commands in [Repro Commands](./external-security-review/REPRO_COMMANDS.md).
4. Map findings using the [Threat Model Evidence Matrix](./external-security-review/THREAT_MODEL_EVIDENCE_MATRIX.md).
5. Report per [Reviewer Checklist](./external-security-review/REVIEWER_CHECKLIST.md).

---

## Scope summary

**In scope:** Abraxas Verify APIs, zkLogin/browser sessions, decision receipts, Partner Flow, partner API keys, return URL allowlists, audit metadata, Supabase service-role server usage, admin identity review.

**Out of scope (initial review):** On-chain Move contracts, MoonPay, unrelated marketplace UI, vendor platform security (Supabase/Vercel/Google/Veriff). See [Beta Limitations and Scope](./external-security-review/BETA_LIMITATIONS_AND_SCOPE.md).

---

## Deployed artifact (record at review time)

| Field | Value |
|-------|-------|
| Target environment | `https://abraxasworld.xyz` |
| Deployed commit SHA | _Record at review time_ |
| Migrations of note | 053 (idempotency), 054 (audit index) — confirm applied |

---

## Architecture references

| Document | Path |
|----------|------|
| Trust Model v1 | `docs/TRUST_MODEL_V1.md` |
| Security threat model (STRIDE) | `docs/SECURITY_THREAT_MODEL.md` |
| Claim contract matrix | `docs/CLAIM_MATRIX.md` |
| Partner Flow integration | `docs/PARTNER_FLOW_INTEGRATION.md` |
| Integration preflight | `docs/INTEGRATION_PREFLIGHT.md` |
| Production walkthrough (IAT) | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |

---

## Key management (operator verification)

| Asset | Env var | Verify |
|-------|---------|--------|
| Receipt / credential signing | `ABRAXAS_SIGNING_KEY` | `GET /api/trust/status` → `signing_configured` |
| Browser session | `ABRAXAS_BROWSER_SESSION_SECRET` | Partner-flow 401 without cookie |
| Partner API keys | DB `partner_api_keys` | Partner-authenticated routes |
| Supabase service role | `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never in client |

```bash
npm run gate:verify-receipt-fixture
npm run integration:preflight   # optional live probes — see REPRO_COMMANDS.md
```

---

## Gate completion criteria

Complete **only when**:

1. Independent reviewer delivers written report.
2. Critical/High findings resolved or accepted with documented disposition in `docs/RELEASE_DECISION.md`.
3. Report reference and reviewed SHA recorded by operator.

Until then: **external review not completed**.
