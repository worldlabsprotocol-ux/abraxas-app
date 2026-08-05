# External Security Review — Reviewer Guide

**Audience:** Independent security reviewers.  
**Baseline commit:** `origin/main` after PR #114.  
**Disclaimer:** This guide describes intended controls and code locations. It does not assert that a review has occurred or that the system is production-clean.

---

## 1. System overview

Abraxas Verify is a Next.js application (Vercel) backed by Supabase (Postgres + Storage). It issues **portable credentials** and **signed decision receipts** (`dr_*`) that relying partners use to gate access. Holders authenticate via **Google zkLogin**; partners authenticate via **API keys** (`abx_*`).

```
Internet (untrusted)
  ├─ Holder browser ── zkLogin OAuth ──► Abraxas API (browser session cookie)
  └─ Partner backend ── API key ───────► Abraxas API (/api/v1/*)

Abraxas API (Next.js, server-only secrets)
  ├─ Auth: zkLogin register, browser session mint/verify
  ├─ Partner Flow: evaluate / complete / refresh → session receipts
  ├─ Trust: credential + receipt signing (Ed25519)
  ├─ Admin / IDV: identity review, credential lifecycle
  └─ requireSupabaseAdmin() ──► Supabase (service role)

Supabase
  ├─ Postgres: identities, credentials, receipts, partners, audit_events
  └─ Storage: passport-documents (PII)
```

**Primary code roots:** `app/api/`, `lib/`, `supabase/migrations/`.

---

## 2. Trust boundaries

| ID | Boundary | Untrusted side | Trusted side | Enforcement |
|----|----------|----------------|--------------|-------------|
| TB-1 | Public edge | Internet | Next.js API routes | Auth middleware per route; input validation |
| TB-2 | App ↔ datastore | Client / partner | Postgres via service role | Server routes only; no service key in browser |
| TB-3 | Holder identity | OAuth provider | `sui_zklogin_identities` | JWKS verify + salt-bound address |
| TB-4 | Partner integration | Partner backends | Partner-scoped APIs | API keys; return URL allowlist |
| TB-5 | Public artifacts | Anyone with receipt ID | Public receipt view | No PII; signature + validity checks |
| TB-6 | Operator | Admin users | Admin routes | Admin session / secrets (see limitations) |

Full STRIDE analysis: `docs/SECURITY_THREAT_MODEL.md`.

---

## 3. OAuth / zkLogin

**Flow:** Client OAuth redirect → callback with `id_token` → `POST /api/auth/zklogin/register` persists `oauth_sub` + derived Sui address + salt.

| Control | Location |
|---------|----------|
| OAuth client / redirect config | `lib/sui/zklogin/config.ts` |
| Callback handling | `app/auth/zklogin/callback/page.tsx`, `lib/sui/zklogin/completeLogin.ts` |
| Register route | `app/api/auth/zklogin/register/route.ts` |
| **Server-side Google JWKS verification** | `lib/auth/verifyZkLoginIdToken.ts` |
| Identity persistence | `supabase/migrations/007_sui_zklogin.sql` |

**Browser session mint** (`POST /api/auth/browser-session`) requires a verified `id_token` and a registered `sui_zklogin_identities` row — see `app/api/auth/browser-session/route.ts`.

**Reviewer focus:** Token replay, `sub` binding, salt handling, dev vs production salt behavior (`docs/ZKLOGIN_BACKEND_SETUP.md`).

---

## 4. Browser sessions

Holder-facing Partner Flow and Passport routes use an **httpOnly HS256 cookie** (`abraxas_browser_session`), not partner API keys.

| Control | Location |
|---------|----------|
| Issue / verify cookie | `lib/auth/browserSession.ts` |
| Mint endpoint (requires `id_token`) | `app/api/auth/browser-session/route.ts` |
| Route guard | `requireBrowserSession()` in partner-flow routes |
| Secret | `ABRAXAS_BROWSER_SESSION_SECRET` (falls back to signing key material if unset — verify deployment) |

**Session validation:** JWT verify + optional lookup that `sui_address` exists in `sui_zklogin_identities` (`lib/auth/browserSession.ts`).

**Partner Flow routes requiring session:**  
`app/api/v1/partner-flow/evaluate/route.ts`, `complete/route.ts`, `refresh/route.ts`.

---

## 5. Public receipts and signature validation

Decision receipts are **Ed25519-signed**, canonical JSON payloads. Partners and the public verify signatures without accessing holder PII.

| Control | Location |
|---------|----------|
| Canonical payload + hash | `lib/decisionReceipts/canonical.ts` |
| Sign / verify | `lib/decisionReceipts/signing.ts` |
| Public view (no PII) | `lib/decisionReceipts/views.ts` (`assertNoPiiInPublicView`) |
| Live validity (expiry, deps, signature) | `lib/decisionReceipts/validityResolver.ts` |
| Fail-closed trust evaluation | `lib/decisionReceipts/trustEvaluation.ts` |
| Public API | `GET /api/receipts/[receiptId]/public` → `app/api/receipts/[receiptId]/public/route.ts` |
| Partner-authenticated view | `GET /api/v1/receipts/[receiptId]` |
| Partner-flow receipt checks | `lib/partner/verifyPartnerFlowReceipt.ts` |
| Signing key status | `GET /api/trust/status` |

**Key material:** `ABRAXAS_SIGNING_KEY` (sign), `ABRAXAS_PUBLIC_KEY` / JWKS endpoint for verify.  
**Fixture gate:** `npm run gate:verify-receipt-fixture`.

---

## 6. Partner return URL allowlists

Partner Flow redirects holders to partner sites only when `return_url` matches the partner's configured allowlist in `partners.allowed_return_urls`.

| Control | Location |
|---------|----------|
| Core allowlist logic | `lib/connect/returnUrlAllowlist.ts` |
| Partner-flow wrapper | `lib/partner/returnUrlAllowlist.ts` |
| Enforced on evaluate / complete / refresh | `app/api/v1/partner-flow/*/route.ts` |

**Reviewer focus:** Open redirect, subdomain takeover, scheme/host parsing, stale hosts in DB (`integration:preflight` checks allowlist when Supabase creds provided).

---

## 7. Idempotency (Partner Flow)

Server-derived idempotency keys prevent duplicate decisions/receipts for the same logical request.

| Key pattern | Use |
|-------------|-----|
| `pf_session:{partner}:{subject}:{policy}` | Evaluate / refresh session receipts |
| `pf_vr:{verification_request_id}` | Complete after Passport |

| Control | Location |
|---------|----------|
| Key builders + conflict type | `lib/partner/partnerFlowIdempotency.ts` |
| Issuance orchestration | `lib/partner/relyingPartyFlow.ts` (`issuePartnerSessionReceipt`) |
| DB column (migration 053) | `supabase/migrations/053_partner_flow_idempotency.sql` |
| Pre-migration safe deploy | `lib/partner/verificationDecisionsSchema.ts` |
| HTTP 409 on conflict | Partner-flow routes |

**Refresh replacement:** Expired session receipts may be superseded with a **new** `receipt_id` on the same `ft_vr_*` trace; audit distinguishes cycles via `issuance_operation` and `replaced_receipt_id`.

---

## 8. Audit metadata (Partner Flow P1-3)

Partner Flow emits structured `audit_events` for IAT reconstruction. Metadata is **write-time normalized** to exclude PII.

| Control | Location |
|---------|----------|
| Metadata contract + forbidden keys | `lib/partner/partnerFlowAuditContract.ts` |
| Emission helpers | `lib/partner/partnerFlowAudit.ts` |
| Read-only trace analyzer | `lib/partner/partnerFlowTraceAudit.ts` |
| CLI (production) | `npm run audit:partner-flow-trace -- <flow_trace_id>` |
| DB index (migration 054) | `supabase/migrations/054_partner_flow_audit_index.sql` |

**`flow_trace_id`:** Server-derived; prioritizes `verification_request_id` → `ft_vr_{id}`. Client-supplied trace IDs are rejected on mismatch (`rejectMismatchedClientFlowTrace`).

**Canonical metadata keys:** `flow_trace_id`, `partner_id`, `policy_id`, `decision_id`, `receipt_id`, `issuance_operation`, `replaced_receipt_id`, `replay_status`, `idempotency_key` (VR-scoped only), `outcome`, `error` (sanitized codes).

**Actions:** `partner_flow.evaluate`, `consent`, `receipt_issued`, `idempotent_replay`, `complete`, `refresh`, `rejected`.

---

## 9. Supabase service-role boundaries

The **service role key must never reach the browser**. Server routes and scripts use it for full database access.

| Pattern | Location |
|---------|----------|
| Preferred wrapper | `lib/supabase/admin.ts` (`requireSupabaseAdmin`) |
| Direct `createClient` (legacy / auth routes) | `app/api/auth/*`, some identity routes |
| Read-only operator scripts | `scripts/integration-preflight.ts`, `scripts/partner-flow-trace-audit.ts` |

**RLS:** Application logic enforces authorization in route handlers; service role bypasses RLS — treat every server route as a trust boundary.

**PII storage:** `passport-documents` bucket; identity tables — admin/IDV routes only.

---

## 10. High-priority API surface

| Route | Auth | Risk notes |
|-------|------|------------|
| `POST /api/v1/partner-flow/evaluate` | Browser session | Policy eval + receipt issuance |
| `POST /api/v1/partner-flow/complete` | Browser session | Post-Passport receipt + redirect |
| `POST /api/v1/partner-flow/refresh` | Browser session | Replacement receipt after expiry |
| `POST /api/auth/browser-session` | `id_token` | Session mint |
| `POST /api/auth/zklogin/register` | `id_token` | Identity registration |
| `GET /api/receipts/{id}/public` | None (capability URL) | Signature + no PII |
| `GET /api/v1/receipts/{id}` | Partner API key | Partner-scoped receipt |
| `POST /api/v1/verify/decisions/{id}` | Partner API key | Trust Decision fetch |
| `POST /api/identity/documents/capture` | Browser session | Document upload |
| `POST /api/admin/identity/approve` | Admin session | Credential issuance |
| `POST /api/idv/sync-decision` | **Unauthenticated** | See limitations doc |

Full tree: `app/api/`.

---

## 11. Suggested review order

1. Read `docs/SECURITY_THREAT_MODEL.md` (STRIDE) and this guide.
2. Run static checks in [REPRO_COMMANDS.md](./REPRO_COMMANDS.md).
3. Trace holder auth: zkLogin → browser session → Partner Flow.
4. Trace partner auth: API key → receipt verify → return URL allowlist.
5. Trace receipt lifecycle: issue → sign → public view → validity.
6. Sample production trace audit for a known `flow_trace_id`.
7. Report using [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md).
