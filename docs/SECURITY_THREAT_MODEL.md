# Abraxas Protocol — Security & Threat Model

**Date:** 2026-07-29  
**Type:** Design review (STRIDE) — not a penetration test  
**Scope:** Trust boundaries, authentication flows, credential issuance, partner callbacks, session receipts, admin actions, and public API surface  
**Environment:** https://abraxas-app.vercel.app (production) + Supabase (service role)  
**Method:** Source code audit, cross-reference with protocol maturity and backward-compatibility audits  
**Verdict:** **NOT production-clean.** Cryptographic foundations are sound; authorization gaps and operational fragility remain. Suitable for pre-production review — fixes deferred to Phase 2.

---

## Executive Summary

Abraxas is transitioning from a verification application to trust infrastructure. The security question is no longer "Can it work?" but **"Can other companies build on it without inheriting hidden risk?"**

This review finds:

| Area | Assessment |
|------|------------|
| Cryptographic artifacts (credentials, receipts) | **Strong** — Ed25519 signing, canonical payloads, schema_version on receipts |
| Partner API authentication | **Adequate** — scoped `abx_*` keys, optional `REQUIRE_PARTNER_API_KEY` |
| Holder / browser session model | **Weak** — session minting lacks OAuth proof at API layer |
| Unauthenticated data exposure | **High risk** — credential JWT and identity status enumerable by address |
| Admin authentication | **Fragmented** — three parallel models (PIN, ADMIN_SECRET, email allowlist) |
| IDV pipeline integrity | **Partial** — Veriff webhook signed; sync-decision endpoint is public |
| Partner flow / session receipts | **Partial** — return URL allowlist works; idempotency gap creates duplicate receipts |
| Auditability | **Partial** — events exist but trail is fragmented |

**Pre-production gate:** This document plus a successful Phase 1 production walkthrough are the minimum bar before onboarding real partners. Neither alone is sufficient.

**Governing rule (Phase 2+):** Every change must either (1) prove an existing capability works in production, or (2) increase reliability, auditability, or interoperability. Security fixes that satisfy (2) belong in Phase 2 hardening — not here.

---

## 1. System Context

### 1.1 Actors

| Actor | Trust level | Goals |
|-------|-------------|-------|
| **Holder** | Semi-trusted | Obtain credential, use partner services |
| **Relying partner** (e.g. Good Trouble) | Trusted business relationship | Verify holder eligibility, receive signed receipt |
| **Abraxas operator / admin** | Highly trusted | Review identity, approve credentials, manage partners |
| **IDV provider** (Veriff) | Trusted third party | Document + liveness verification |
| **Anonymous attacker** | Untrusted | Enumerate data, forge sessions, issue credentials, bypass policy |
| **Compromised partner** | Semi-trusted | Abuse API keys, scrape receipts, probe holder status |

### 1.2 Critical Assets

1. **ABRAXAS_SIGNING_KEY** — Ed25519 private key; signs credentials and decision receipts
2. **ABRAXAS_BROWSER_SESSION_SECRET** — HMAC secret for holder browser sessions
3. **Partner API keys** (`abx_live_*`, `abx_test_*`) — partner authentication
4. **ADMIN_PIN / ADMIN_SECRET / INTERNAL_API_SECRET** — operational secrets
5. **VERIFF_SECRET** — webhook HMAC verification
6. **Supabase service role key** — full database access from server routes
7. **Holder PII** — ID images, selfies, legal name (Supabase Storage `passport-documents`)
8. **Credential JWTs** — portable identity assertions
9. **Decision receipts** (`dr_*`) — signed policy evaluation artifacts
10. **User salts** (`sui_zklogin_identities.user_salt`) — deterministic address derivation

### 1.3 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Internet (untrusted)                                                    │
│  ┌──────────────┐    ┌─────────────────────────────────────────────┐  │
│  │ Holder       │    │ Partner backend                              │  │
│  │ browser      │    │ (API key: abx_*)                             │  │
│  └──────┬───────┘    └──────────────────┬──────────────────────────┘  │
│         │ zkLogin OAuth                  │ HTTPS                         │
└─────────┼────────────────────────────────┼──────────────────────────────┘
          │                                │
══════════╪════════════════════════════════╪══════════════════════════════  TB-1: Public edge
          ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Abraxas Next.js API (Vercel)                                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Auth layer      │  │ Partner flow     │  │ Admin / IDV routes    │ │
│  │ browser session │  │ evaluate/complete│  │ approve, queue, keys  │ │
│  │ zkLogin register│  │ receipts         │  │                       │ │
│  └────────┬────────┘  └────────┬─────────┘  └───────────┬───────────┘ │
└───────────┼────────────────────┼─────────────────────────┼───────────────┘
            │                    │                         │
════════════╪════════════════════╪═════════════════════════╪══════════════  TB-2: App ↔ datastore
            ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Storage) — service role from server only           │
│  identity_verifications, abraxas_credentials, decision_receipts,         │
│  partner_api_keys, partners.allowed_return_urls, audit_events            │
└─────────────────────────────────────────────────────────────────────────┘
            ▲
════════════╪══════════════════════════════════════════════════════════════  TB-3: External IDV
            │
┌───────────┴───────────┐
│  Veriff API + webhook │
└───────────────────────┘
```

---

## 2. Authentication & Session Flows

### 2.1 zkLogin Registration

**Path:** Client OAuth → `POST /api/auth/zklogin/register` → `sui_zklogin_identities`

| Step | Control | Gap |
|------|---------|-----|
| Client sends `id_token` + `oauth_sub` | `decoded.sub === oauth_sub` | **No server-side JWT signature verification** against Google JWKS |
| Salt generation / persistence | Per `oauth_sub`, stored server-side | Dev mode uses ephemeral salt (documented) |
| Address derivation | `jwtToAddress(id_token, user_salt)` | Forged token with matching `sub` could register if signature not checked |

**STRIDE:** Spoofing (S), Elevation of privilege (E)

### 2.2 Browser Session Minting

**Path:** `POST /api/auth/browser-session` with `{ sui_address }` → httpOnly cookie

```13:48:app/api/auth/browser-session/route.ts
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { sui_address?: string };
  // ...
  const { data } = await sb
    .from("sui_zklogin_identities")
    .select("sui_address")
    .eq("sui_address", sui)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "Account not registered" }, { status: 403 });
  }
  const token = await issueBrowserSessionToken(sui);
  // ...
}
```

| Control | Gap |
|---------|-----|
| Address must exist in `sui_zklogin_identities` | **Anyone who knows a registered Sui address can mint a session** without proving OAuth ownership |
| JWT signed with `ABRAXAS_BROWSER_SESSION_SECRET` | Secret falls back to `ABRAXAS_SIGNING_KEY` if unset — key reuse |
| Session re-validated against DB on each request | Good — revoked/deleted identity invalidates session |

**Impact:** Attacker who learns or guesses a holder's Sui address can call partner-flow evaluate/complete as that holder (if they can reach the API). Mitigated partially because address is 32-byte hex and not published in partner callbacks.

**STRIDE:** Spoofing (S), Elevation of privilege (E)

### 2.3 Partner API Key Auth

**Path:** `Authorization: Bearer abx_*` or `X-Abraxas-Api-Key` → `partner_api_keys` lookup

| Control | Gap |
|---------|-----|
| SHA-256 hash storage | Good |
| Scoped permissions (`verify:credential`, etc.) | Good |
| Revocation via `revoked_at` | Good |
| `REQUIRE_PARTNER_API_KEY` env gate | **Defaults off** — some routes work without key when env unset |
| `last_used_at` update | Informational only |

**STRIDE:** Spoofing (S), Information disclosure (I) when keys optional

### 2.4 Admin Authentication (Fragmented)

Three parallel models coexist:

| Model | Used by | Secret exposure |
|-------|---------|-----------------|
| **PIN** (`ADMIN_PIN` / `NEXT_PUBLIC_ADMIN_PIN`) | `checkAdmin`, `checkAdminAccess`, `/api/admin/session`, `/api/credentials/revoke` | **PIN may ship in client bundle** via `NEXT_PUBLIC_*` |
| **ADMIN_SECRET** header | Legacy asset queue (`/api/admin/queue`, approve/reject) | Server-only |
| **Email allowlist** (`ABRAXAS_ADMIN_EMAILS`) | `checkAdminAccess` on identity review routes | Requires valid browser session + zkLogin email |

Additional issues:

- `checkAdmin()` returns `true` in non-production when `ADMIN_PIN` unset — dev convenience, dangerous if misconfigured deploy
- `admin/partners` uses `checkAdmin` (PIN only), not `checkAdminAccess` (email path)
- Cielo calendar routes default PIN to `"abraxas2026"` if env unset
- Admin session cookie is deterministic hash of PIN — no per-session nonce

**STRIDE:** Spoofing (S), Elevation of privilege (E), Repudiation (R)

---

## 3. Credential Issuance Paths

### 3.1 Veriff Webhook (Production IDV)

**Path:** Veriff → `POST /api/idv/webhook` → `processVeriffDecision` → credential insert

| Control | Gap |
|---------|-----|
| HMAC-SHA256 (`VERIFF_SECRET`, `x-hmac-signature`) | Good when secret configured |
| Signature skipped in non-production if secret unset | Expected for dev |
| Idempotent `credential_jti` check in processor | Partial — race window documented in maturity audit |

**STRIDE:** Spoofing (S), Tampering (T)

### 3.2 Public Sync-Decision Endpoint

**Path:** `GET|POST /api/idv/sync-decision?sui=…` — **no authentication**

| Capability | Risk |
|------------|------|
| Poll Veriff decision for any known Sui address | Information disclosure (verification status) |
| `POST { sui_address, session_id }` attaches arbitrary Veriff session to holder row | **Session fixation / cross-user binding** if attacker supplies victim address + their session ID |
| Triggers `processVeriffDecision` → credential issuance on approval | Tampering (T), Elevation (E) |

**STRIDE:** Spoofing (S), Tampering (T), Information disclosure (I), Elevation of privilege (E) — **HIGH**

### 3.3 Direct Issue Endpoint

**Path:** `POST /api/credentials/issue`

| Control | Gap |
|---------|-----|
| `INTERNAL_API_SECRET` required in production | Good |
| **Open in non-production** | Anyone can mint credentials in dev/staging |
| Upserts `identity_verifications` as approved | Bypasses entire IDV pipeline when reachable |

**STRIDE:** Elevation of privilege (E)

### 3.4 Manual Capture + Admin Approve

**Path:** `POST /api/identity/documents/capture` (browser session) → admin queue → `POST /api/admin/identity/approve`

| Control | Gap |
|---------|-----|
| `requireBrowserSession` on capture | Good |
| Rate limit via `checkCaptureRateLimit` | Partial |
| Pending-review duplicate guard | Good |
| Admin approve requires `checkAdminAccess` | Good |
| Biometric auto-approve path (policy-driven) | By design — document in partner policy |
| PII stored in Supabase Storage | Bucket policy must restrict public access (out of app scope) |

**STRIDE:** Tampering (T), Information disclosure (I), Denial of service (D)

### 3.5 Unauthenticated Credential Export

**Path:** `GET /api/credentials/me?sui=0x…` — **no authentication**

Returns full `credential_jwt` for any approved, non-revoked holder address.

**STRIDE:** Information disclosure (I) — **HIGH**

---

## 4. Partner Flow & Callbacks

### 4.1 Flow Overview

```
Partner site → /partner/verify → zkLogin → POST /api/v1/partner-flow/evaluate
  ├─ no credential → Passport → capture → admin approve → POST /complete → redirect
  └─ active credential → session receipt → redirect with receipt_id
```

### 4.2 Return URL Allowlist

**Control:** `isReturnUrlAllowed(partnerId, returnUrl)` checks `partners.allowed_return_urls`

| Control | Gap |
|---------|-----|
| HTTPS required (HTTP localhost only) | Good |
| Origin + pathname prefix match | Good — blocks open redirect to arbitrary domains |
| Default demo URLs when partner has no allowlist | **New partners without migration 051 may redirect only to demo URLs** |
| Query params appended by Abraxas | Partners must not log sensitive data from URL (documented) |

**STRIDE:** Tampering (T) — open redirect if allowlist misconfigured

### 4.3 Partner Callback Parameters

Redirect includes: `status`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id` — **no PII by design**.

| Control | Gap |
|---------|-----|
| Receipt ID is capability token | Anyone with `receipt_id` can fetch public receipt view |
| No HMAC on callback params | Partner should verify receipt server-side via Abraxas API |
| `PartnerFlowReturnHandler` silent failure on redirect | Holder may be stranded (reliability, not security) |

**STRIDE:** Information disclosure (I) — receipt ID leakage enables eligibility probing

### 4.4 Session Receipt Issuance

**Path:** `issuePartnerSessionReceipt` in `lib/partner/relyingPartyFlow.ts`

| Control | Gap |
|---------|-----|
| Policy re-evaluated at issue time | Correct for security; breaks immutability expectations (compat audit) |
| Ed25519 signed receipt via `issueReceiptForDecision` | Good |
| **Always inserts new `verification_decisions` row** | No idempotency — duplicate receipts on retry/refresh |
| `issueDecisionReceipt` supports idempotency keys | **Not used by partner session path** |

**STRIDE:** Repudiation (R) — conflicting receipts for same session; Denial of service (D) — receipt sprawl

---

## 5. Decision Receipts

### 5.1 Public Receipt Endpoint

**Path:** `GET /api/receipts/{receiptId}/public` — unauthenticated

| Control | Gap |
|---------|-----|
| `getPublicReceipt` + `assertNoPiiInPublicView` | Good — PII stripped |
| Signature included for partner verification | Good |
| Receipt ID is bearer token | Design choice — 96-bit entropy (`dr_` + 12 bytes) |
| `Cache-Control: public, max-age=60` | Fine for public artifact |
| CORS `*` | Intentional for partner verification |

**STRIDE:** Information disclosure (I) — eligibility status leak if receipt ID exposed

### 5.2 Partner-Authenticated Receipt

**Path:** `GET /api/v1/receipts/{receiptId}` — requires `verify:requests` scope

| Control | Gap |
|---------|-----|
| Partner ID must match receipt | Good |
| Usage logged via `logPartnerUsage` | Good |

**STRIDE:** Information disclosure (I) — scoped correctly

### 5.3 Signing Key

Single `ABRAXAS_SIGNING_KEY` signs both credentials (via `jose`) and receipts (via `tweetnacl`). Compromise of this key forges all trust artifacts.

**STRIDE:** Spoofing (S), Tampering (T) — **CRITICAL** if key leaked

**Recommended (Phase 2):** Separate keys for credentials vs receipts; JWKS endpoint with key rotation overlap.

---

## 6. Admin Actions

| Action | Route | Auth | Risk |
|--------|-------|------|------|
| Identity approve/reject | `POST /api/admin/identity/approve` | `checkAdminAccess` | Medium — issues credentials |
| Document URL (PII) | `GET /api/admin/identity/document-url` | `checkAdminAccess` | **High** — presigned ID/selfie access |
| Identity queue | `GET /api/admin/identity/queue` | `checkAdminAccess` | Medium — PII metadata |
| Partner CRUD | `/api/admin/partners` | `checkAdmin` (PIN only) | High — can set return URL allowlists |
| Partner API keys | `/api/admin/partner-keys` | PIN via `checkAdmin` | **Critical** — mints partner keys |
| Credential revoke | `POST /api/credentials/revoke` | `x-admin-pin` vs `NEXT_PUBLIC_ADMIN_PIN` | High — uses client-exposed PIN |
| Receipt admin view | `/api/admin/receipts` | PIN | Medium |
| Asset queue (legacy) | `/api/admin/queue` | `ADMIN_SECRET` | Medium |

**STRIDE:** Elevation of privilege (E) — inconsistent auth models increase misconfiguration risk

---

## 7. API Endpoint Risk Register

Risk ratings: **Critical / High / Medium / Low**. Status reflects current code, not desired state.

### 7.1 Unauthenticated or Weakly Authenticated

| Endpoint | Method | Risk | Primary threat | Mitigation today | Remaining risk |
|----------|--------|------|----------------|------------------|----------------|
| `/api/credentials/me` | GET | **Critical** | Full JWT export by Sui address | None | Any known address → credential theft |
| `/api/identity/status` | GET | **High** | Status enumeration by address/email | None | Verification state leak |
| `/api/idv/sync-decision` | GET/POST | **High** | Trigger/sync IDV; session attach | Veriff API key server-side | Session fixation; unauthorized sync |
| `/api/auth/browser-session` | POST | **High** | Session minting without OAuth proof | Address must exist in DB | Address knowledge → impersonation |
| `/api/auth/zklogin/register` | POST | **High** | Account registration with unverified JWT | `sub` match only | Forged token if signature unchecked |
| `/api/receipts/{id}/public` | GET | **Medium** | Receipt content by ID | No PII in view; high entropy ID | Eligibility leak if ID exposed |
| `/api/credentials/verify` | POST | **Low–Med** | Public path when `credential_jwt` in body | JWT crypto verification | Partner key optional for JWT path |
| `/api/credentials/issue` | POST | **Med (dev)** | Arbitrary credential mint | Prod: `INTERNAL_API_SECRET` | Open in non-prod |
| `/api/wallet/binding/challenge` | POST | **Medium** | Challenge spam | Supabase-backed | DoS; no holder auth |

### 7.2 Holder Session Required

| Endpoint | Method | Risk | Notes |
|----------|--------|------|-------|
| `/api/v1/partner-flow/evaluate` | POST | Medium | Return URL allowlist; issues duplicate receipts |
| `/api/v1/partner-flow/complete` | POST | Medium | Same idempotency gap |
| `/api/v1/partner-flow/refresh` | POST | Medium | Intentionally re-issues receipt |
| `/api/identity/documents/capture` | POST | Medium | PII upload; rate limited |
| `/api/identity/my-verification` | GET | Low | Scoped to session holder |

### 7.3 Partner API Key Required (when `REQUIRE_PARTNER_API_KEY=true`)

| Endpoint | Method | Risk | Notes |
|----------|--------|------|-------|
| `/api/v1/receipts/{id}` | GET | Low | Partner-scoped |
| `/api/credentials/verify` | POST | Low | When no JWT in body |
| `/api/v1/verification-requests/*` | * | Low–Med | Core partner integration |

### 7.4 Webhook / Internal

| Endpoint | Method | Risk | Notes |
|----------|--------|------|-------|
| `/api/idv/webhook` | POST | Low (when configured) | HMAC verified |
| `/api/cron/*` | GET | Medium | Should verify `CRON_SECRET` |
| `/api/credentials/issue` | POST | Low (prod) | Internal secret |

### 7.5 Admin

| Endpoint | Auth model | Risk |
|----------|------------|------|
| `/api/admin/identity/*` | `checkAdminAccess` | Medium |
| `/api/admin/partners`, `/api/admin/partner-keys` | PIN only | **High** |
| `/api/admin/queue`, approve/reject assets | `ADMIN_SECRET` | Medium |
| `/api/credentials/revoke` | Client-exposed PIN | **High** |

---

## 8. STRIDE Summary by Category

### Spoofing

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Forge holder browser session | JWT HMAC | No OAuth binding at mint | Require zkLogin proof or signed challenge before `browser-session` |
| Forge partner requests | API key hash | Optional enforcement | Set `REQUIRE_PARTNER_API_KEY=true` in production |
| Forge Veriff webhook | HMAC | Disabled if secret unset | Fail closed in production if `VERIFF_SECRET` missing |
| Forge admin actions | PIN / email / secret | PIN in client bundle | Remove `NEXT_PUBLIC_ADMIN_PIN`; unify on `checkAdminAccess` + server-only secrets |
| Forge zkLogin registration | `sub` check | No JWKS verify | Verify `id_token` signature against provider JWKS |

### Tampering

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Modify policy outcomes post-decision | Signed receipts | Live re-evaluation changes `currently_valid` | Immutable policy version binding (Phase 2) |
| Attach wrong Veriff session to holder | — | Public `sync-decision` POST | Require browser session; bind session to holder |
| Modify partner redirect target | Allowlist | Misconfigured partner row | Admin UI validation; audit allowlist changes |
| Modify credential claims after issue | JWT signature | Revocation registry partial | Unify revocation across claims + legacy columns |

### Repudiation

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Operator denies approval action | `appendAuditEvent` on some paths | Fragmented trail | Unified audit stream (Phase 2) |
| Partner denies receipt issuance | Signed receipt | Duplicate receipts on retry | Idempotency on session receipt path |
| Holder denies consent | Consent receipts exist | `consented` state not always written | Complete consent state machine |

### Information Disclosure

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Credential JWT by address | — | **Critical** | Require browser session or holder signature |
| Identity status by address/email | — | **High** | Same as above |
| PII in admin document URL | `checkAdminAccess` | Insider threat | Short TTL presigned URLs; access logging |
| Receipt eligibility by ID | Public endpoint by design | Medium | Document as capability token; optional partner-only mode |
| API key in logs | Prefix only stored | Low | Ensure raw key never logged |

### Denial of Service

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Capture endpoint spam | Rate limit | Partial | Per-IP + per-holder limits |
| Partner flow evaluate storm | None | Medium | Rate limit; idempotency |
| Receipt table bloat | — | Medium (retry duplicates) | Idempotency keys |
| Veriff sync polling abuse | None | Medium | Auth + rate limit on sync-decision |

### Elevation of Privilege

| Threat | Mitigation | Remaining risk | Recommended action |
|--------|------------|----------------|-------------------|
| Issue credential without IDV | `INTERNAL_API_SECRET` in prod | Dev endpoint open | Disable or gate staging |
| Self-approve identity | Admin routes | PIN-only on some admin paths | Consolidate admin auth |
| Escalate partner scopes | DB scopes array | Compromised admin | MFA + separate admin deployment |
| Skip policy via direct verify | Policy engine | Legacy paths | Deprecate unversioned verify |

---

## 9. Secrets & Configuration

| Secret | Exposure surface | Risk |
|--------|------------------|------|
| `NEXT_PUBLIC_ADMIN_PIN` | Client JavaScript bundle | **Critical** — revoke API, admin session |
| `ADMIN_PIN` | Server + header | Medium |
| `ADMIN_SECRET` | Server header only | Low |
| `INTERNAL_API_SECRET` | Server header only | Low |
| `ABRAXAS_SIGNING_KEY` | Server only | Critical if leaked |
| `ABRAXAS_BROWSER_SESSION_SECRET` | Server only; falls back to signing key | High if shared |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Critical |
| `VERIFF_SECRET` / `VERIFF_API_KEY` | Server only | High |
| Partner `abx_*` keys | Partner possession | Medium per partner |

**Production checklist (security):**

- [ ] `NEXT_PUBLIC_ADMIN_PIN` unset — use server-only `ADMIN_PIN`
- [ ] `REQUIRE_PARTNER_API_KEY=true`
- [ ] `ABRAXAS_BROWSER_SESSION_SECRET` set independently of signing key
- [ ] `VERIFF_SECRET` set (or IDV path disabled intentionally)
- [ ] `INTERNAL_API_SECRET` set
- [ ] `ABRAXAS_ADMIN_EMAILS` configured for identity admin
- [ ] Supabase Storage bucket `passport-documents` not public

---

## 10. Data Flow — Good Trouble Reference Integration

```
[GT Enter] → [Abraxas /partner/verify]
    → zkLogin (Google) → register (salt stored)
    → browser-session (address only)                    ← TB-1 weakness
    → evaluate (session + allowlisted return_url)
        → if approved: issuePartnerSessionReceipt        ← idempotency gap
        → redirect GT/enter?receipt_id=dr_…
[GT Enter] → GET /api/receipts/dr_…/public (optional)   ← bearer receipt ID
```

**Trust assumptions GT must understand:**

1. Receipt proves Abraxas evaluated policy at `evaluated_at` — not real-time guarantee after expiry
2. `receipt_id` in URL is sensitive — treat like a session token
3. Abraxas does not call GT server-side; GT must verify receipt independently
4. Returning users skip Passport only while credential active and policy approves

---

## 11. Alignment with Phase 1.5 Freeze

After production walkthrough passes, freeze per roadmap:

| Artifact | Freeze item | Security implication |
|----------|-------------|---------------------|
| Database schemas | No silent column semantics changes | Migrations must be versioned |
| Public APIs | `/api/v1/*` contracts stable | Document breaking-change policy |
| Credential formats | JWT claim set | Add `schema_version` before freeze |
| Receipt formats | `schema_version: 1.0.0` | Already frozen — do not change canonicalization |
| Behavior | Version, don't mutate | Policy re-evaluation is a silent behavior change — fix in Phase 2 |

Release tag (e.g. `v1.0.0-beta`) should mark the security boundary for external partners.

---

## 12. Pre-Production Security Gate

### Must fix before real partner onboarding (Phase 2 priority 0)

1. **Authenticate `/api/credentials/me`** — browser session or holder signature required
2. **Authenticate `/api/identity/status`** — same
3. **Remove or server-gate `NEXT_PUBLIC_ADMIN_PIN`**
4. **Authenticate `/api/idv/sync-decision`** — session required; validate session belongs to holder
5. **Bind browser-session minting to zkLogin proof** — not address alone
6. **Verify zkLogin `id_token` signature** server-side

### Should fix in Phase 2 hardening

7. Session receipt idempotency (holder + partner + policy window)
8. Unified admin auth (`checkAdminAccess` everywhere)
9. `REQUIRE_PARTNER_API_KEY=true` enforced
10. Separate signing keys for credentials vs receipts
11. Rate limiting on public endpoints
12. Immutable policy version on decisions
13. Unified audit trail

### Acceptable residual risk (documented)

- Receipt ID as capability token (mitigated by entropy + no PII)
- Public `/api/credentials/verify` with JWT in body (JWT is self-authenticating)
- Manual admin review in pilot (operational, not protocol)

---

## 13. Conclusion

Abraxas has **credible cryptographic trust artifacts** — signed credentials and decision receipts with canonical payloads. That is the right foundation for infrastructure.

The blockers to "protocol you can trust other companies to build on" are **authorization and operational discipline**, not missing features:

- Holders can be impersonated at the session layer
- Credentials can be exfiltrated by address enumeration
- Admin authentication is fragmented and partially client-exposed
- Session receipts lack idempotency, weakening audit integrity

**This threat model does not pass a clean pre-production security review.** It passes a **honest** one — the gaps are identifiable, bounded, and map directly to Phase 2 work. Combined with a successful Phase 1 production walkthrough and Phase 1.5 freeze, Abraxas can credibly transition from building core infrastructure to onboarding real partners.

**No fixes implemented in this document.** Recommended actions are input to Phase 2 prioritization.

---

## Appendix A — Key Source Files

| Domain | Files |
|--------|-------|
| Browser session | `lib/auth/browserSession.ts`, `app/api/auth/browser-session/route.ts` |
| zkLogin | `app/api/auth/zklogin/register/route.ts` |
| Admin auth | `lib/adminAuth.ts`, `app/api/admin/session/route.ts` |
| Partner auth | `lib/partner/partnerAuth.ts` |
| Partner flow | `lib/partner/relyingPartyFlow.ts`, `app/api/v1/partner-flow/*` |
| Return URLs | `lib/connect/returnUrlAllowlist.ts` |
| Credentials | `app/api/credentials/me/route.ts`, `app/api/credentials/issue/route.ts` |
| IDV | `app/api/idv/webhook/route.ts`, `app/api/idv/sync-decision/route.ts` |
| Receipts | `lib/decisionReceipts/service.ts`, `lib/decisionReceipts/signing.ts` |
| Public receipt | `app/api/receipts/[receiptId]/public/route.ts` |

## Appendix B — Related Audits

- `docs/PRODUCTION_READINESS_AUDIT.md` — live HTTP probes
- `docs/PROTOCOL_MATURITY_AUDIT.md` — idempotency, audit trail, policy versioning
- `docs/BACKWARD_COMPATIBILITY_AUDIT.md` — API and schema stability
- `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` — Phase 1 validation script
