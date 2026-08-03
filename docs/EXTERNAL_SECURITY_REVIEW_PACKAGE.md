# External Security Review — Package (beta)

**Status:** Blocked on external reviewer — no independent report exists in this repository.  
**Purpose:** Handoff package for third-party security review. Not a substitute for an external report.

---

## Scope

- Abraxas Verify public APIs (`/api/v1/*`, `/api/credentials/*`, `/api/receipts/*`)
- Browser session + zkLogin authentication
- Partner-flow and Trust Decision issuance
- Decision receipt signing (Ed25519)
- Supabase-backed persistence and RLS
- Admin identity review surface

**Out of scope for initial review:** On-chain passport contracts, MoonPay integrations, unrelated marketplace features.

---

## Deployed artifact

| Field | Value |
|-------|-------|
| Target environment | `https://abraxasworld.xyz` (production) |
| Deployed commit SHA | _Record at review time — must match IAT evidence_ |
| Prerequisite merge | PR #101 (`residency_country` issuance) |
| Baseline tag | `v1.0.0-beta.0` (not yet created) |

---

## Architecture and threat model references

| Document | Path |
|----------|------|
| Trust Model v1 | `docs/TRUST_MODEL_V1.md` |
| Security threat model (STRIDE) | `docs/SECURITY_THREAT_MODEL.md` |
| Claim contract matrix | `docs/CLAIM_MATRIX.md` |
| Production walkthrough (IAT) | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |
| Protocol compatibility | `docs/PROTOCOL_COMPATIBILITY.md` |

---

## Key management and signing

| Asset | Storage | Verification |
|-------|---------|------------|
| Credential JWT signing | `ABRAXAS_SIGNING_KEY` (EdDSA JWK) | `GET /api/trust/status` → `signing_configured` |
| Decision receipt signing | Same key material / `ABRAXAS_PUBLIC_KEY` for verify | `npm run gate:verify-receipt-fixture` |
| Browser session | `ABRAXAS_BROWSER_SESSION_SECRET` (HS256) | Partner-flow routes return 401 without cookie |

**Operator commands:**

```bash
npm run gate:verify-receipt-fixture
npm run audit:production   # requires AUDIT_BASE_URL
npm run gate:preflight     # optional BETA_GATE_BASE_URL
```

---

## API inventory (review priority)

| Route | Auth | Risk notes |
|-------|------|------------|
| `POST /api/v1/partner-flow/evaluate` | Browser session | Policy evaluation, session receipt |
| `POST /api/v1/partner-flow/complete` | Browser session | Partner callback trigger |
| `POST /api/v1/verify/decisions/{id}` | Partner API key | IDOR scoped by partner |
| `GET /api/receipts/{id}/public` | Receipt ID capability | No PII; signature verify |
| `POST /api/identity/documents/capture` | Browser session | Document upload |
| `POST /api/admin/identity/approve` | Admin session | Credential issuance |
| `POST /api/credentials/revoke` | Admin | Credential lifecycle |

Full route list: `app/api/` tree.

---

## Evidence already in repository

- P0 regression suite: `npm test` (407+ tests at beta prep)
- Trust layer tests: `lib/trust/trustLayer.test.ts`
- Decision receipt signing tests: `lib/decisionReceipts/decisionReceipts.test.ts`
- Validity negative tests: `lib/decisionReceipts/validityResolver.test.ts`
- Production readiness probes: `scripts/production-readiness-audit.ts`

---

## Gate completion criteria

This gate is **complete only when**:

1. Independent reviewer delivers written report (PDF or signed memo)
2. Critical/High findings resolved or accepted with documented disposition
3. Report reference linked in `docs/RELEASE_DECISION.md`

Until then: **Status = Blocked on external reviewer**
