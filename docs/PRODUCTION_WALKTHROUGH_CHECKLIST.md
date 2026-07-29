# Production Walkthrough Checklist — Phase 1

**Purpose:** Prove what exists before changing code.  
**Environment:** https://abraxas-app.vercel.app  
**Prerequisites:** Test Google account, admin PIN access, Supabase migrations 049–051 applied

Record every step: timestamp, HTTP status, screenshot, API response snippet.

---

## Setup

- [ ] Confirm migrations applied: `049`, `050` (GT biometric thresholds), `051` (return URLs)
- [ ] Confirm `ABRAXAS_SIGNING_KEY` configured on Vercel
- [ ] Confirm `ABRAXAS_BROWSER_SESSION_SECRET` configured
- [ ] Note starting `active_credentials` from `GET /api/metrics/public`

---

## Path A — First-Time User

| # | Step | Expected | Evidence | Pass? |
|---|------|----------|----------|-------|
| 1 | Land on `/good-trouble` | Page loads, "Continue with Abraxas" visible | Screenshot | |
| 2 | Click Continue with Abraxas | Redirect to `/partner/verify?...` | URL bar | |
| 3 | Sign in with Google (zkLogin) | Wallet created, session cookie set | `GET /api/auth/zklogin/me` → 200 | |
| 4 | Partner evaluate runs | `POST /api/v1/partner-flow/evaluate` → `next: passport` | Network tab response | |
| 5 | Redirect to Passport | `/passport?verify_request=...&return=...` | URL bar | |
| 6 | Upload ID document | `POST /api/identity/documents/capture` or upload route → 200 | Response JSON | |
| 7 | Upload selfie / biometric capture | Capture completes, `biometric.analyzed` in logs | Admin queue shows assessment | |
| 8 | Admin reviews in `/admin/identity` | v3 signals visible, reason_codes shown | Screenshot | |
| 9 | Admin approves | `POST /api/admin/identity/approve` → `ok: true`, `jti` returned | Response JSON | |
| 10 | Credential issued | `abraxas_credentials` row exists; `active_credentials` +1 | DB or metrics | |
| 11 | Partner complete runs | `POST /api/v1/partner-flow/complete` → `redirect_url` | Network tab | |
| 12 | Redirect to `/good-trouble/enter?receipt_id=...` | Receipt validates, "You're in" | Screenshot | |
| 13 | Receipt signature valid | `GET /api/receipts/{id}/public` → `signature_valid: true` | Response JSON | |
| 14 | No PII in callback URL | URL contains only `receipt_id`, `status`, `credential_id` — no DOB/images | URL inspection | |

---

## Path B — Returning User

| # | Step | Expected | Evidence | Pass? |
|---|------|----------|----------|-------|
| 15 | Sign out / clear session | Session cleared | | |
| 16 | Click Continue with Abraxas again | `/partner/verify` | | |
| 17 | Sign in with same Google account | Same wallet address | | |
| 18 | Evaluate runs once | `POST /api/v1/partner-flow/evaluate` → `next: enter` (NOT passport) | Response JSON | |
| 19 | Redirect to GT with receipt | Immediate — no ID upload, no selfie | Screenshot | |
| 20 | Single API call only | Only one evaluate call in network tab | Network tab | |

---

## Path C — Expired / Revoked Credential

| # | Step | Expected | Evidence | Pass? |
|---|------|----------|----------|-------|
| 21 | Expire credential (admin or DB `expiration_date`) | Credential status → expired | | |
| 22 | Continue with Abraxas | Evaluate → `next: passport` | Response JSON | |
| 23 | Re-verify through Passport | New capture + admin approval | | |
| 24 | New credential issued | New `jti`, redirect to GT | | |

| # | Step (revoked) | Expected | Evidence | Pass? |
|---|----------------|----------|----------|-------|
| 25 | Revoke credential via admin | `POST /api/credentials/revoke` | | |
| 26 | Continue with Abraxas | Evaluate → passport path | | |

---

## Path D — Failure Recovery

| # | Step | Expected | Evidence | Pass? |
|---|------|----------|----------|-------|
| 27 | Close browser mid-capture, reopen | User can resume or restart without duplicate credential | | |
| 28 | Admin rejects verification | User sees rejection message, can resubmit | | |
| 29 | Partner redirect fails (simulate) | User sees recovery UI, not silent failure | | |
| 30 | Expired session receipt | Refresh button re-issues receipt | `POST /api/v1/partner-flow/refresh` | |

---

## Automated Pre-Check (run before walkthrough)

```bash
npm test                              # 353 tests
npm run audit:production              # Live HTTP probes
npm run biometric:validate-policy     # GT policy scenarios
```

---

## Bug Fix Rule

If any step fails during walkthrough:
1. Log the failure with evidence
2. Fix **only that bug**
3. Re-run the failed step
4. Do not start Phase 2 hardening until all Path A + B steps pass

---

## Sign-Off

| Role | Name | Date | All paths pass? |
|------|------|------|-----------------|
| Engineering | | | |
| Product | | | |

When signed off, proceed to Phase 2 (Protocol Hardening) per `docs/PROTOCOL_MATURITY_AUDIT.md`.
