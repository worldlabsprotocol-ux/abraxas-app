# Institutional Acceptance Test (IAT) — Execution Guide

**Document type:** Institutional Acceptance Test protocol  
**Mindset:** _Would a regulated partner sign off on this?_ — not "does it click through?"  
**Environment:** https://abraxas-app.vercel.app  
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
| Request ID | `vr_*` or correlation ID |
| Decision ID | `decision_id` |
| Receipt ID | `dr_*` |
| Duration | e.g. 1.8s |
| Evidence | Screenshot + logs |
| Notes | Any deviations |

Record into `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`.

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
| 3 | Sign in with Google (zkLogin) | Session cookie set | `GET /api/auth/zklogin/me` → 200 |
| 4 | Partner evaluate | `POST /api/v1/partner-flow/evaluate` → `next: passport` | Request ID, response JSON |
| 5 | Redirect to Passport | `/passport?verify_request=...` | URL |
| 6 | Consent ceremony | Session required; atomic submit | verification_request ID |
| 7 | Upload ID document | Capture → 200 | Response JSON |
| 8 | Upload selfie / biometric | Assessment queued | Admin queue screenshot |
| 9 | Admin approves | `jti` returned | Response JSON |
| 10 | Credential issued | `active_credentials` +1 | Metrics or DB |
| 11 | Partner complete | `redirect_url` with receipt | Network tab |
| 12 | Enter page | Receipt validates, "You're in" | Screenshot |
| 13 | Receipt signature | `signature_valid: true` | `GET /api/receipts/{id}/public` |
| 14 | Callback URL | No PII — only `receipt_id`, `status`, `credential_id` | URL inspection |
| 15 | Trust Decision fetch | Partner-scoped `GET /api/v1/verify/decisions/{id}` | decision_id, JSON |

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

When all scenarios are complete, fill the **Institutional Acceptance Summary** in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`:

```
Scenario A: PASS / FAIL
Scenario B: PASS / FAIL
Scenario C: PASS / FAIL
Scenario D: PASS / FAIL

Critical defects: 0
High defects: 0
Medium defects: X
Low defects: X

Recommendation:
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
