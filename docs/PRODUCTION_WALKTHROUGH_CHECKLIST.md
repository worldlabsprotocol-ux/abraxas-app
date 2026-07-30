# Institutional Acceptance Test (IAT) — Execution Guide

**Phase:** Validation — prove the protocol behaves exactly as designed. **Do not add features.**

**Document type:** Institutional Acceptance Test protocol  
**Mindset:** Onboard a regulated relying party that knows nothing about the implementation — not "test Abraxas."  
**Environment:** https://abraxasworld.xyz (production)  
**Results document:** `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`  
**Trust Model:** `docs/TRUST_MODEL_V1.md`

**Prerequisites:** Test Google account, admin PIN access, Supabase migrations 049–051 applied

---

## Before you start

The IAT produces **evidence**, not confidence-by-assertion. For every scenario, capture:

| Field | Example |
|-------|---------|
| Scenario | New user → regulated purchase |
| Expected result | Approved Trust Decision + signed receipt |
| Actual result | Pass / Fail |
| Request ID | UUID (`verification_requests.id`; query param `verify_request`) |
| Decision ID | UUID (`verification_decisions.id`) |
| Receipt ID | `dr_*` (Ed25519 signed decision receipt) |
| Duration | e.g. 1.8s |
| Evidence | Screenshot + logs |
| Notes | Confusing steps, actionable errors, recovery without eng help, log gaps |

Record into `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`.

---

## Implementation reference (Good Trouble reference flow)

Verified against `main` — use this to trace IDs through the lifecycle.

| Protocol step | Implementation | Auth |
|---------------|----------------|------|
| **Entry** | `/good-trouble` → `Continue with Abraxas` → `/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1&return_url=…` | Public |
| **Authorization (server)** | `POST /api/v1/verify/authorize` with `permission` + `redirect_uri` | Partner API key (`verify:requests`) |
| **Authorization (browser)** | GT uses `policy_id` in verify URL (equivalent to `regulated_purchase` permission) | — |
| **zkLogin session** | Google sign-in on `/partner/verify`; `GET /api/auth/zklogin/me` → 200; `abraxas_browser_session` cookie | Verified Google `id_token` (JWKS) |
| **Policy evaluation** | `POST /api/v1/partner-flow/evaluate` — body: `partner_id`, `policy_id`, `return_url` | Browser session required |
| **Passport redirect** | `next: passport` → `passport_url` with `verify_request`, `partner_id`, `policy_id`, `return` | Session |
| **Consent ceremony** | `GET /api/v1/verification-requests/{id}` (session required); `POST …/consent` | Browser session |
| **Identity capture** | `POST /api/identity/documents/capture` (document + selfie) | Browser session |
| **Admin approval** | `/admin/identity` → `POST /api/admin/identity/approve` (`action: approve`) | Admin session |
| **Partner complete** | `PartnerFlowReturnHandler` auto-calls `POST /api/v1/partner-flow/complete` when credential earned | Browser session |
| **Trust Decision** | Row in `verification_decisions`; `decision_id` in evaluate/complete response | — |
| **Signed receipt** | `dr_*` via `issueReceiptForDecision`; `GET /api/receipts/{id}/public` → `signature_valid` | Public (receipt ID is capability token) |
| **Decision retrieval** | `GET /api/v1/verify/decisions/{id}` or `GET /api/v1/decisions/{id}/status` | Partner API key; partner-scoped |
| **Retry / idempotency** | Duplicate `complete` → same receipt (`sessionDecision.ts`); consent retry atomic | Session |
| **Receipt refresh** | `POST /api/v1/partner-flow/refresh` when session receipt expired | Browser session |
| **Denied flow** | `next: denied` + `reason_codes`; no receipt issued | — |
| **Audit events** | `appendAuditEvent` — e.g. `partner_session.receipt_issued`, `verification_request.created` | Server-side |
| **Cross-partner IDOR** | Wrong partner → 404 on decision status / verify decisions | Partner API key scope |

**GT constants:** `partner_id=good-trouble-cannabis` · `policy_id=good-trouble-retail-v1` · enter callback `/good-trouble/enter`

**Callback URL params (no PII):** `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`

---

## Setup

- [ ] Confirm `main` commit matches production deployment SHA
- [ ] Confirm migrations applied: `049`, `050`, `051`
- [ ] Confirm `ABRAXAS_SIGNING_KEY` on Vercel
- [ ] Confirm `ABRAXAS_BROWSER_SESSION_SECRET` on Vercel
- [ ] Run automated pre-check:

```bash
npm test
npm run audit:production
npm run biometric:validate-policy
```

- [ ] Note starting `active_credentials` from `GET /api/metrics/public`

---

## Scenario A — New user → regulated purchase

_End-to-end: authorization → zkLogin → Passport → consent → policy eval → Trust Decision → signed receipt._

| # | Step | Expected | Capture |
|---|------|----------|---------|
| 1 | Land on `/good-trouble` | "Continue with Abraxas" visible | Screenshot |
| 2 | Click Continue with Abraxas | Redirect to `/partner/verify?...` | URL |
| 3 | Sign in with Google (zkLogin) | Session cookie set; evaluate blocked without session | `GET /api/auth/zklogin/me` → 200 |
| 4 | Partner evaluate | `POST /api/v1/partner-flow/evaluate` → `next: passport`, `verification_request_id` | UUID, response JSON |
| 5 | Redirect to Passport | `/passport?verify_request={uuid}&partner_id=…&policy_id=…&return=…` | URL |
| 6 | Consent ceremony | `ConsentCeremony` shown; `POST /api/v1/verification-requests/{id}/consent` | verification_request UUID |
| 7 | Upload ID document | `POST /api/identity/documents/capture` → 200 | Response JSON |
| 8 | Upload selfie / biometric | Capture completes; admin queue shows assessment | Admin queue screenshot |
| 9 | Admin approves | `POST /api/admin/identity/approve` → credential `jti` | Response JSON |
| 10 | Credential issued | `abraxas_credentials` row; `active_credentials` +1 | Metrics or DB |
| 11 | Partner complete (auto) | `PartnerFlowReturnHandler` → `POST /api/v1/partner-flow/complete` | Network tab |
| 12 | Redirect to enter | `/good-trouble/enter?decision_id=…&receipt_id=dr_…&…` | Screenshot |
| 13 | Receipt signature | `GET /api/receipts/{dr_*}/public` → `signature_valid: true` | Response JSON |
| 14 | Callback URL | No PII — only IDs listed in implementation reference | URL inspection |
| 15 | Trust Decision fetch | `GET /api/v1/verify/decisions/{decision_id}` with partner API key | decision_id, JSON |

**Fill Scenario A block in results doc.** Record decision_id, receipt_id, duration (evaluate → receipt).

---

## Scenario B — Returning user → credential-first

| # | Step | Expected | Capture |
|---|------|----------|---------|
| 1 | Clear session | Session gone | |
| 2 | Continue with Abraxas | `/partner/verify` | |
| 3 | Same Google account | Same wallet address | |
| 4 | Single evaluate | `next: enter` — NOT passport | Response JSON, duration |
| 5 | Immediate enter | No ID upload, no selfie | Screenshot |
| 6 | Network tab | Exactly one evaluate call | HAR |

**Fill Scenario B block in results doc.**

---

## Scenario C — Expired / revoked credential

| # | Step | Expected | Capture |
|---|------|----------|---------|
| 1 | Expire credential | Status → expired | Before state |
| 2 | Continue with Abraxas | `next: passport` | Response JSON |
| 3 | Re-verify through Passport | New capture + approval | |
| 4 | New credential + receipt | New `jti`, new `dr_*` | After state |

| # | Step (revoked) | Expected | Capture |
|---|----------------|----------|---------|
| 5 | Revoke via admin | `POST /api/credentials/revoke` | |
| 6 | Continue with Abraxas | Passport path again | |

**Fill Scenario C block in results doc.**

---

## Scenario D — Failure recovery

| # | Step | Expected | Capture |
|---|------|----------|---------|
| 1 | Close browser mid-capture | Resume or clean restart | Screenshot |
| 2 | Admin rejects | User message, resubmit path | |
| 3 | Redirect failure (simulate) | Recovery UI, not silent failure | |
| 4 | Expired session receipt | `POST /api/v1/partner-flow/refresh` re-issues | Response JSON |
| 5 | Duplicate complete | Same receipt (idempotent) | Network tab |

**Fill Scenario D block in results doc.**

---

## Supplementary checks (if reviewer requires)

- [ ] Invalid partner API key → 401
- [ ] Cross-partner decision read → 403/404
- [ ] Audit events queryable for evaluate + receipt issuance
- [ ] Logs sufficient to diagnose a failed evaluate

Record in supplementary protocol evidence sections of results doc.

---

## Institutional Acceptance Summary

When all scenarios are complete, fill the **Institutional Acceptance Summary** in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`.

**Sign-off requires measurable thresholds — not "all scenarios passed" by assertion.**

### IAT release thresholds

| Metric | Target |
|--------|--------|
| Critical defects | 0 |
| High defects | 0 |
| Regression suite | 100% passing |
| Security regressions | 0 |
| Data integrity issues | 0 |
| Reproducible failures | 0 |
| IAT scenarios (A–D exercised) | 100% pass |

```
Scenario A: PASS / FAIL
Scenario B: PASS / FAIL
Scenario C: PASS / FAIL
Scenario D: PASS / FAIL

Recommendation (all thresholds must be met to tag):
☐ Do not release
☐ Ready to tag v1.0.0-beta.0
☐ Ready to enter external security review
```

---

## On pass

1. Sign the IAT results document
2. Create `docs/PROTOCOL_COMPATIBILITY.md` (public contract freeze)
3. Complete `docs/RELEASE_DECISION.md` (release sign-off)
4. Tag repository: **`git tag -a v1.0.0-beta.0 -m "Canonical baseline: IAT passed, contract frozen, pre-P1" && git push origin v1.0.0-beta.0`**
5. Begin P1-1 (immutable policy versions)

**Do not start P1 until `v1.0.0-beta.0` is tagged with the compatibility document included.**

---

## Operational observations (capture in Notes)

Treat the IAT like your first customer onboarding:

- Were any steps confusing?
- Were error messages actionable?
- Could someone recover without engineering help?
- Were logs sufficient to diagnose issues?
- Did request ID → decision ID → receipt ID trace the full lifecycle?
