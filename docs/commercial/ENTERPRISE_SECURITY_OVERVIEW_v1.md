# Enterprise security overview v1

| Field | Value |
|-------|-------|
| **Status** | Draft v1 · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Purpose

Technical diligence overview for **beta-stage** integrators and security reviewers. This is **not** a certification report, penetration test result, SOC 2 letter, or regulatory approval.

**Requires external validation:** independent security review — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Cited implementation or documentation. |
| **Planned / partial** | Known gap documented in repo. |
| **Requires external validation** | Third-party assessment not present. |

---

## Product security model

| Principle | Evidence |
|-----------|----------|
| Abraxas is trust/authorization infrastructure | `README.md` L7–8; `docs/TRUST_MODEL_V1.md` |
| Documented partner-output path returns trust decisions + signed receipts | `lib/partner/relyingPartyFlow.ts`; `lib/decisionReceipts/service.ts` |
| Abraxas is **not** a KYC provider | `README.md` L7–8 |
| Institutional readiness (L4) | **Not yet** — `docs/TRUST_MODEL_V1.md` L25 |

Production readiness score in trust model (68/100, controlled pilot) is an **internal engineering assessment** — `docs/TRUST_MODEL_V1.md` L27 — **requires external validation**.

---

## Trust boundaries

```
Holder browser ──► Abraxas APIs (Partner Flow, Passport)
                         │
                         ├──► Supabase (data, storage) — requires operator and counsel confirmation
                         ├──► Signing keys (env) — Ed25519 receipts / JWT credentials
                         └──► Optional: Veriff when IDV_PROVIDER=veriff
Partner backend ◄── signed receipt + derived claims (current partner response contract excludes raw DOB/images per `partnerVerificationResult.ts`)
```

Data flows: `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md`.

---

## Authentication and authorization

| Surface | Control | Evidence | Beta limitation |
|---------|---------|----------|-----------------|
| Partner API keys | DB-stored keys; revoked via admin | `lib/partner/partnerAuth.ts` | Key compromise playbook — `docs/TRUST_MODEL_V1.md` §10.3 |
| Partner Flow browser session | Cookie-bound holder session | `app/api/v1/partner-flow/evaluate/route.ts` (401 without session) | Session secret fallback documented — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` |
| Admin console | PIN / email allowlist | `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` L12 | **Admin auth fragmentation** — `docs/SECURITY_THREAT_MODEL.md`; `BETA_LIMITATIONS_AND_SCOPE.md` |
| Authorization boundary | Application-layer on API routes | RLS not relied on — `BETA_LIMITATIONS_AND_SCOPE.md` | Service role concentration |

---

## Cryptographic controls (verified)

| Asset | Mechanism | Evidence |
|-------|-----------|----------|
| Decision receipts | Ed25519 over canonical payload | `lib/decisionReceipts/signing.ts`, `canonical.ts` |
| Credentials | JWT via `jose` | `lib/credentials/*` |
| Public verification | `GET /api/receipts/[receiptId]/public` | `app/api/receipts/[receiptId]/public/route.ts` |
| Key rotation | Env update + redeploy | `docs/TRUST_MODEL_V1.md` §10.4; `app/security/page.tsx` |

---

## Partner Flow security features

| Feature | Status | Evidence |
|---------|--------|----------|
| Rate limiting | Upstash or in-memory | `docs/PARTNER_FLOW_RATE_LIMITS.md`; `lib/partner/partnerFlowRateLimit.ts` |
| Return URL allowlists | Configured per partner | Partner onboarding docs |
| Idempotency | Migration 053 | **Requires operator confirmation** applied — `BETA_LIMITATIONS_AND_SCOPE.md` |
| Webhook signing + outbox | Implemented | `docs/PARTNER_WEBHOOKS.md`; `lib/partner/webhooks/*` |
| Receipt revocation | Control plane | `lib/decisionReceipts/revocationControlPlane.ts` |

---

## Privacy and data handling (summary)

| Topic | Status |
|-------|--------|
| Holder privacy requests | **Verified** — `lib/privacy/privacyControlPlane.ts` |
| Physical deletion / purge | **Planned / partial** — `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` |
| Native vs Veriff capture | See `docs/commercial/DATA_RESPONSIBILITY_MATRIX.md` |
| `over_21` to partners | Policy-derived boolean — **not DOB-derived** — `lib/partner/partnerVerificationResult.ts` |

---

## Observability

| Capability | Evidence |
|------------|----------|
| Public protocol status | `app/api/protocol/status/route.ts` |
| Partner Flow health (admin) | `app/admin/partner-flow/`; `lib/partner/partnerFlowHealth.ts` |
| Audit events | `docs/TRUST_MODEL_V1.md` §11 |
| Flow trace audit | `scripts/partner-flow-trace-audit.ts` |

---

## Security review readiness

| Item | Status |
|------|--------|
| Reviewer package | **Verified** — `docs/external-security-review/` |
| Independent review performed | **Missing** — blocked per `docs/RELEASE_READINESS.md` L18 |
| In-repo pentest report | **Missing** — `BETA_LIMITATIONS_AND_SCOPE.md` |
| Threat model (STRIDE) | **Verified** — `docs/SECURITY_THREAT_MODEL.md` (design review, not pentest) |

---

## Known beta limitations (honest)

From `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md`:

| Limitation | Reference |
|------------|-----------|
| Admin auth fragmentation | Multiple admin auth models |
| Public `POST /api/idv/sync-decision` | Unauthenticated sync path |
| Credential / status enumeration risk | Some holder endpoints |
| No WAF documentation in repo | Deployment-specific |
| E2E holder flow not in CI | Manual/scripted E2E required |
| IAT walkthrough may lag code | Compare SHA to `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` |

---

## Audit tracker (verified)

`lib/securityProgram.ts` — items including Sui Passport module, credential API, zkLogin prover, payment verification are **in_progress**, **scheduled**, or **planned** — not complete.

---

## Bug bounty (pre-registration)

| Field | Value |
|-------|-------|
| Email | `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64 |
| Phase | Pre-registration — L62–63 |
| Researcher SLAs | Internal targets for bounty triage — **not customer SLAs** — L91–98 |

---

## What this document is not

- Not SOC 2, ISO 27001, HIPAA, or PCI DSS attestation
- Not penetration test results
- Not a statement that Abraxas is audit-ready, regulatory-grade, or compliant
- Not a subprocessor or DPA document — see `docs/commercial/THIRD_PARTY_SERVICE_INVENTORY_v1.md`

---

## External next steps

| Action | Owner |
|--------|-------|
| Commission independent review → `reports/external-security-review/independent-review.md` | Security firm |
| Security questionnaire responses | Counsel + security firm |
| Complete human IAT evidence | Operator |
