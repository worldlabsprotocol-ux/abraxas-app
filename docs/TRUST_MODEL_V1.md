# Abraxas Trust Model v1

**Version:** 1.0  
**Date:** 2026-07-30  
**Status:** Protocol security whitepaper — post-P0 hardening  
**Audience:** Enterprise security teams, relying party engineers, institutional reviewers  
**Scope:** Abraxas Verify trust decision lifecycle (permission → signed receipt)  
**Not in scope:** Penetration test results, feature roadmap, implementation audit

---

## 1. Purpose

This document describes **what Abraxas trusts, what it does not trust, and how trust is established, maintained, and revoked**. It is the protocol's security contract — intended for reviewers who will never read application code.

Abraxas is trust infrastructure, not a verification feature. Relying parties receive **Trust Decisions** backed by **signed receipts**. Holders interact with **Passport** (a container for credentials). The **Trust Engine** evaluates evidence and issues decisions internally.

**Readiness context (2026-07-30):**

| Level | Status |
|-------|--------|
| L1 — Architecture | Complete |
| L2 — Engine | Complete |
| L3 — Hardening | In progress (P0 complete, P1 pending) |
| L4 — Institutional readiness | Not yet |

Production readiness score: **68/100** (post-P0). Suitable for controlled pilot with one relying party. Not yet suitable for multi-tenant institutional deployment without P1 completion and walkthrough evidence.

---

## 2. Trust Assumptions

### 2.1 What Abraxas assumes is true

| Assumption | Rationale |
|------------|-----------|
| **Abraxas operator** controls signing keys, database, and deployment with reasonable operational security | Issuer of last resort for trust decisions |
| **Google OAuth / zkLogin** correctly authenticates holder identity at login time | Browser session minting requires verified `id_token` (JWKS) |
| **Relying parties** protect API keys (`abx_*`) and validate receipts server-side before high-value actions | Abraxas does not call partner backends |
| **Veriff** (when used) provides accurate IDV outcomes; webhook HMAC is verified | External evidence provider |
| **TLS** terminates correctly between all parties and Abraxas | Transport security is out-of-band |
| **Supabase** Postgres integrity; service role key is server-only | Data plane trust |
| **Ed25519** and SHA-256 are cryptographically sound | Receipt and credential signatures |
| **Receipt IDs** are unguessable capability tokens | Partners must treat `receipt_id` / `decision_id` like session secrets |

### 2.2 What Abraxas does not assume

| Non-assumption | Implication |
|----------------|-------------|
| Relying parties are benign | Scoped API keys, return URL allowlists, partner-scoped decision reads |
| Holders are honest about address ownership at API layer | Session bound to registered zkLogin identity |
| Policies are static forever | Versioned policies required (P1); live re-eval can invalidate decisions |
| A receipt is valid forever | `valid_until` + live validity re-check; partners must verify at settlement |
| All issuers are equally trusted | Issuer trust rules per claim type and partner |
| Biometric stdout logs are durable | Telemetry persistence is P1 |

---

## 3. Assets

### 3.1 Critical secrets

| Asset | Purpose | Compromise impact |
|-------|---------|-------------------|
| `ABRAXAS_SIGNING_KEY` | Signs decision receipts (Ed25519) | Forge trust decisions |
| `ABRAXAS_BROWSER_SESSION_SECRET` | HS256 holder browser sessions | Impersonate holders |
| Partner API keys (`abx_live_*`, `abx_test_*`) | Relying party authentication | Create requests, read scoped decisions |
| `VERIFF_SECRET` | Webhook HMAC | Fake IDV outcomes |
| Supabase service role key | Full database access | Total data breach |
| Admin credentials (`ADMIN_PIN`, etc.) | Operational review | Approve/revoke credentials, manage partners |

### 3.2 Trust artifacts (integrity-protected)

| Artifact | ID format | Contains PII? |
|----------|-----------|---------------|
| Decision receipt | `dr_*` | No — claim refs + issuer IDs only |
| Credential JWT | `jti` | Metadata only; no document images |
| Consent receipt | UUID | Purpose + claim types authorized |
| Trust Decision (API) | `decision_id` | Derived booleans; no raw documents |

### 3.3 Sensitive data (confidentiality)

- Government ID images, selfies (Supabase Storage `passport-documents`)
- Legal name, DOB (admin review only; never returned to relying parties)
- `oauth_sub`, zkLogin salts (identity binding)

---

## 4. Threat Actors

| Actor | Capability | Primary goals |
|-------|------------|---------------|
| **Anonymous internet attacker** | Public API access, UUID guessing | Enumerate data, bypass auth, forge sessions |
| **Malicious holder** | Own wallet, browser session | Escalate claims, replay consent, probe policies |
| **Compromised relying party** | Valid API key, allowlisted redirect | Cross-tenant data access, scrape decisions, policy probing |
| **Compromised partner (insider)** | Admin or ops access | Approve fraudulent credentials, alter policies |
| **External issuer (future)** | Submit attestation API | Issue untrusted claims if registry misconfigured |
| **IDV provider failure** | Veriff outage or breach | Stale or fraudulent identity evidence |

---

## 5. Attack Surfaces

### 5.1 Public edge (unauthenticated)

| Surface | Risk | P0 status |
|---------|------|-----------|
| `GET /api/receipts/{id}/public` | Receipt enumeration if IDs leak | Mitigated by entropy; no PII in payload |
| `POST /api/credentials/verify` | JWT in body is self-authenticating | By design |
| `GET /api/trust/status?sui=` | Holder trust enumeration | **P1** — still unauthenticated |

### 5.2 Holder-authenticated

| Surface | Risk | P0 status |
|---------|------|-----------|
| Browser session minting | Session forgery | **Fixed** — requires Google `id_token` + JWKS |
| `GET /api/credentials/claims` | Claim enumeration | **Fixed** — session required |
| `GET /api/v1/verification-requests/{id}` | Request metadata leak | **Fixed** — session required |
| `POST .../consent` | Double consent / race | **Fixed** — atomic claim + idempotent retry |
| Partner-flow evaluate/complete | Flow manipulation | Session required; orchestration tested |

### 5.3 Relying-party-authenticated

| Surface | Risk | P0 status |
|---------|------|-----------|
| `GET /api/v1/decisions/{id}/status` | Cross-tenant IDOR | **Fixed** — partner ownership check |
| `POST /api/v1/verification-requests` | Wrong policy for partner | **Fixed** — policy ownership validation |
| `POST /api/v1/policies/evaluate` | Untrusted issuer approval | **Fixed** — trust context with partner ID |
| Return URL redirect | Open redirect | Mitigated — per-partner allowlist |

### 5.4 Admin / operational

| Surface | Risk | Status |
|---------|------|--------|
| Admin PIN / secret auth | Fragmented models | **P1** — unify admin auth |
| Identity review queue | Fraudulent approval | Human process + audit log |
| Policy UPDATE in place | Retroactive decision change | **P1** — immutable policy versions |

### 5.5 External integrations

| Surface | Control |
|---------|---------|
| Veriff webhook | HMAC signature |
| Issuer claim submit (`POST /api/v1/issuers/claims/submit`) | API key + issuer registry |
| Asset signals webhook | Partner key + replay protection |

---

## 6. Privilege Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  UNTRUSTED: Internet, anonymous callers                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ TLS
┌────────────────────────────▼────────────────────────────────────┐
│  HOLDER TIER: Browser session (zkLogin-bound)                    │
│  • Read own claims, consent, identity status                     │
│  • Cannot read other holders' data                               │
│  • Cannot mint partner API calls                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  RELYING PARTY TIER: API key + scopes                            │
│  • verify:requests — create requests, read own decisions         │
│  • verify:credential — JWT verification                          │
│  • Scoped to partner_id; cannot read other partners' decisions   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  TRUST ENGINE (internal): Policy + issuer trust + evaluation       │
│  • Not exposed to partners or holders directly                   │
│  • Issues Trust Decisions and signed receipts                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  OPERATOR TIER: Admin auth                                       │
│  • Credential approval, partner onboarding, policy admin         │
│  • Highest privilege — audited                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tenancy rule:** Every relying-party read of a decision, receipt, or policy evaluation must verify `resource.partner_id === authenticated.partner_id`. Enforced in P0 for decision status and trust decision APIs.

---

## 7. Trust Decision Lifecycle

```
Permission (stable)  →  Policy (versioned)  →  Claims  →  Evidence  →  Issuers
                              ↓
                        Trust Engine
                              ↓
                     Passport (holder store)
                              ↓
                     Trust Decision (product)
                              ↓
                     Signed Receipt (proof)
```

### 7.1 What partners receive

- `decision.approved` — boolean outcome
- `decision_id` — stable reference
- `proof.receipt_id` — cryptographic artifact
- Optional derived fields (`over_21`, etc.) — convenience only; receipt is authoritative

### 7.2 What partners must do

1. **Authorize** — `POST /api/v1/verify/authorize` with `permission` + `redirect_uri`
2. **Redirect holder** — hosted Abraxas Verify flow
3. **Receive callback** — `decision_id` + `receipt_id` in query params
4. **Validate at settlement** — `GET /api/v1/verify/decisions/{id}` or verify receipt signature
5. **Never trust client-side claims alone**

---

## 8. Cryptographic Assumptions

| Mechanism | Algorithm | Usage |
|-----------|-----------|-------|
| Decision receipt signature | Ed25519 over SHA-256(canonical JSON) | Tamper-evident trust decisions |
| Receipt canonicalization | Sorted keys, deterministic JSON | Cross-runtime verification |
| Browser session | HS256 JWT, httpOnly cookie | Holder authentication |
| zkLogin id_token | Google RS256 JWKS | Session minting proof |
| Partner API keys | SHA-256 hash stored; `abx_*` prefix | Relying party auth |
| Subject pseudonym | HMAC-derived ID in receipts | Privacy in partner-facing artifacts |

**Key rotation:** Receipts pin `signing_key_id`. Rotation requires publishing new public key before signing with new private key. Old receipts remain verifiable with archived public keys.

**Schema freeze:** Decision receipt `schema_version: 1.0.0` — canonicalization must not change without version bump.

---

## 9. Failure Modes

| Failure | System behavior | Partner impact | P0/P1 |
|---------|-----------------|----------------|-------|
| Signing key missing | Consent fails closed (no receipt) | Error, no false proof | P0 fixed |
| Concurrent consent | Idempotent return of existing decision | Safe retry | P0 fixed |
| Session receipt retry | Reuses active session decision | Same receipt, no sprawl | P0 fixed |
| Claim revoked after approval | Receipt invalidated on validity check | Must re-verify at settlement | By design |
| Policy updated in DB | Re-eval may diverge from signed receipt | **Confusing** — P1 immutable versions |
| Trust Decision `approved` without validity check | API may overstate validity | **P1** — integrate `resolveReceiptValidity` |
| Audit insert fails | Mutation proceeds (fail-open) | Compliance gap | P1 |
| Veriff webhook missed | Polling fallback (`sync-decision`) | Delayed credential | Operational |
| Supabase unavailable | Routes fail; no silent approve | Hard failure | By design |

**Principle:** Fail closed on proof issuance. Fail closed on authentication. Fail open only where explicitly documented (audit logging — P1 fix pending).

---

## 10. Recovery Procedures

### 10.1 Credential revocation

1. Operator revokes credential via admin or `POST /api/credentials/revoke`
2. Claims transition to `revoked` via `credentialStatusRegistry`
3. Active decision receipts invalidated on next `resolveReceiptValidity` check
4. Relying parties with cached approvals must re-verify

### 10.2 Receipt revocation

1. Operator or system marks `decision_receipts.status = revoked`
2. Public verification returns `currently_valid: false`
3. Signed artifact preserved for audit; validity state updated

### 10.3 Partner API key compromise

1. Revoke key in admin (`partner_api_keys.revoked_at`)
2. Rotate: issue new key, update partner integration
3. Review `partner_api_usage` and `audit_events` for abuse window
4. Invalidate active session decisions if partner scope was abused (manual review)

### 10.4 Signing key compromise

1. **Emergency:** Rotate `ABRAXAS_SIGNING_KEY` and `ABRAXAS_PUBLIC_KEY`
2. Publish new `signing_key_id`
3. Old receipts verifiable only with archived public key
4. All new receipts signed with new key
5. Post-incident: review decisions issued during compromise window

### 10.5 Policy misconfiguration

1. **Current:** In-place UPDATE of `partner_policies.rules_json` affects live re-eval
2. **P1 target:** Immutable version rows; new version = new row; decisions pin `policy_version`
3. Partners on permission `regulated_purchase` receive latest compatible version only when explicitly migrated

---

## 11. Observability & Audit (P1)

| Store | Contents | Gap |
|-------|----------|-----|
| `audit_events` | Request created, decided, receipt issued | Consent grant event; partner-flow |
| `partner_api_usage` | v1 API telemetry | Partner-flow routes not logged |
| `identity_verification_events` | IDV pipeline | Fragmented from trust decisions |
| stdout biometric logs | Capture telemetry | Not durable on serverless |

**Institutional requirement:** Unified query surface and partner-flow logging before L4.

---

## 12. Residual Risks (accepted for v1.0.0-beta pilot)

| Risk | Mitigation | Exit criteria |
|------|------------|---------------|
| Receipt ID as capability token | High entropy; HTTPS only; short TTL | Document in partner integration guide |
| Sandbox policies marked `sandbox_only` | Receipts not production-usable | Partner promotion process |
| Manual admin review in pilot | Human-in-the-loop for edge cases | Automation in P2 |
| Single Abraxas signing key | Key rotation procedure documented | HSM / split keys in L4 |
| Policy mutability | P1 immutable versions | Before second relying party |

---

## 13. Verification Checklist for Reviewers

Before institutional adoption, verify:

- [ ] P0 regression suite passes (`npm test`, P0 subset documented in PR #93)
- [ ] Institutional Acceptance Test passed (`docs/PRODUCTION_WALKTHROUGH_RESULTS.md`)
- [ ] Protocol Compatibility document complete (`docs/PROTOCOL_COMPATIBILITY.md`)
- [ ] Release decision signed (`docs/RELEASE_DECISION.md`)
- [ ] `v1.0.0-beta.0` tagged (canonical known-good baseline)
- [ ] P1 complete: immutable policies, Trust Decision validity, observability
- [ ] External security review against this document (not against raw code first)
- [ ] Partner integration uses server-side receipt validation
- [ ] `REQUIRE_PARTNER_API_KEY=true` in production
- [ ] Signing keys and secrets in secure env (not client-exposed)

---

## 14. Roadmap Alignment

```
Institutional Acceptance Test (IAT)
        ↓
API freeze → PROTOCOL_COMPATIBILITY.md
        ↓
RELEASE_DECISION.md (sign-off)
        ↓
Tag v1.0.0-beta.0 (canonical known-good baseline)
        ↓
P1 hardening (immutable policies → validity → observability → telemetry)
        ↓
Ready to enter external security review (unknown unknowns, not known P1s)
        ↓
v1.0.0-beta
        ↓
Second relying party
```

---

## 15. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/SECURITY_THREAT_MODEL.md` | STRIDE design review (pre-P0; partially superseded) |
| `docs/PROTOCOL_MATURITY_AUDIT.md` | Idempotency, audit maturity |
| `docs/PARTNER_FLOW_INTEGRATION.md` | Relying party integration guide |
| PR #93 | P0 hardening + regression tests |

---

## 16. Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-30 | Initial Trust Model — post-P0 hardening, L3 in progress |

**Next review:** After P1 completion and before external security review.
