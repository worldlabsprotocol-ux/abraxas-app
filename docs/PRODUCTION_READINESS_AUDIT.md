# Production Readiness Audit — Good Trouble

**Audited:** 2026-07-29T22:09:47Z  
**Target:** https://abraxas-app.vercel.app  
**Branch audited in CI:** `cursor/homepage-ui-restore-d541`  
**Method:** Live HTTP probes + 353 automated tests + Playwright screenshots  
**Verdict:** **NOT PRODUCTION READY** — infrastructure deployed, full user journey not exercised

---

## Scorecard

| Area | PASS | PARTIAL | FAIL | SKIP |
|------|------|---------|------|------|
| Routes & UI | 6 | 0 | 0 | 0 |
| Partner flow APIs | 3 | 0 | 0 | 0 |
| Credentials & receipts | 2 | 0 | 0 | 0 |
| Infrastructure | 2 | 1 | 0 | 0 |
| Biometric capture | 1 | 0 | 0 | 0 |
| Good Trouble APIs | 1 | 0 | 0 | 0 |
| Full e2e user journey | 0 | 0 | 0 | 7 |
| Production host checks | 0 | 0 | 0 | 2 |
| **Total** | **15** | **1** | **0** | **9** |

---

## What passed on production (live evidence)

### Routes (all HTTP 200)
- `/` — landing page
- `/good-trouble` — pilot page with **Continue with Abraxas** button
- `/partner/verify` — generic partner verification hub
- `/good-trouble/enter` — partner callback / receipt validation
- `/passport` — identity verification

### Partner flow APIs (deployed and secured)
```
POST /api/v1/partner-flow/evaluate  → 401 "Sign in required in this browser" ✅
POST /api/v1/partner-flow/complete  → 401 ✅
POST /api/v1/partner-flow/refresh   → 401 ✅
```
Auth gate working — unauthenticated callers cannot evaluate or issue receipts.

### Credential verification
```
POST /api/credentials/verify { credential_jwt: "invalid" }
→ 422, verified=false, authentication_proof with signature ✅
```
Proof bundle issued even on denial — partners can verify independently.

### Receipt validation
```
GET /api/receipts/dr_nonexistent/public → 404 "Receipt not found" ✅
```

### Infrastructure
```
GET /api/trust/status → signing_configured=true, sponsor_configured=true ✅
GET /api/metrics/public → active_credentials=0 ✅
```

### Good Trouble batch API
```
GET /api/good-trouble/batch?record_id=ABX-CNB-BATCH-002 → ok=true, pilot=true ✅
```

### Biometric capture gate
```
POST /api/identity/documents/capture (no session) → 401 ✅
```

---

## Partial — blockers for full production claim

### IDV provider on production: PARTIAL
```json
{
  "idv_provider": "manual",
  "is_mock": true,
  "error_code": "manual_review_mode",
  "message": "Live Veriff is disabled — upload your ID for pilot manual review instead"
}
```
**Impact:** Production uses manual ID upload, not live Veriff. Biometric capture path exists but automated Veriff sessions are off.

### Production metrics: active_credentials=0
No verified credentials exist in production yet. The returning-user fast path cannot be demonstrated until at least one user completes verification.

---

## Skipped — requires human-in-the-loop (cannot automate in audit environment)

| Step | Why skipped |
|------|-------------|
| New Google account → zkLogin wallet | Requires Google OAuth in browser |
| ID upload + selfie capture | Requires authenticated session + camera/files |
| Admin approval → credential issued | Requires admin PIN + Supabase write access |
| Redirect to GT with receipt | Depends on above |
| Returning user skips Passport | No credentials exist (active_credentials=0) |
| Expired credential → re-verify | No credential to expire |
| Revoked credential → re-verify | No credential to revoke |
| ONNX on production host | Cannot invoke capture with real buffers on Vercel from CI |
| Migration 051 in production DB | No Supabase credentials in audit environment |

---

## Automated test evidence (local CI)

```
npm test                              → 353 passed (90 files)
npm run biometric:validate-policy     → 3 scenarios, GT policy stricter than global on borderline
faceSimilarity.test.ts                → ONNX present + correlation fallback both pass
capturePolicyPipeline.test.ts         → partner reject vs global human_review on same buffers
relyingPartyFlow.test.ts              → 17 passed (new/returning/expired/revoked/PII)
e2eVerification.test.ts               → 4 passed (proof bundle shape)
```

Good Trouble policy validation output:
```
borderline: global=BORDERLINE_HUMAN_REVIEW, GT=FACE_MATCH_LOW (policy_changes_outcome=true)
below:      global=BORDERLINE_HUMAN_REVIEW, GT=LIVENESS_WEAK+FACE_MATCH_LOW (policy_changes_outcome=true)
```

---

## Screenshots (production)

Captured at `/opt/cursor/artifacts/screenshots/audit/`:
- `gt-page-desktop.png` — Good Trouble pilot with Continue with Abraxas
- `partner-verify-desktop.png` — Partner verification hub
- `gt-enter-desktop.png` — Entry/callback page
- `passport-desktop.png` — Passport page
- `gt-page-mobile.png` — Mobile Good Trouble page

---

## 15-step user journey status

| # | Step | Verdict |
|---|------|---------|
| 1 | New Google account | SKIP — needs browser OAuth |
| 2 | zkLogin creates wallet | SKIP |
| 3 | Passport starts | PARTIAL — manual mode only on prod |
| 4 | Upload ID | SKIP |
| 5 | Upload selfie | SKIP |
| 6 | Admin approves | SKIP |
| 7 | Credential issued | SKIP — active_credentials=0 |
| 8 | Redirect back to GT | SKIP |
| 9 | User enters | PARTIAL — /good-trouble/enter loads, no live receipt tested |
| 10 | Log out | SKIP |
| 11 | Log back in | SKIP |
| 12 | Skip Passport | SKIP — no credential exists |
| 13 | Immediate access | SKIP |
| 14 | Expire/revoke credential | SKIP |
| 15 | Passport required again | SKIP |

---

## What must happen before "production ready"

1. **Apply migration 051** to production Supabase (return URLs, session receipt TTL, minimum_age)
2. **Enable Veriff** or confirm manual upload path is acceptable for pilot
3. **Provision ONNX model** on Vercel host for production face matching
4. **Run one full walkthrough** with a real Google account:
   - Sign in → Passport → ID + selfie → admin approve → GT enter with receipt
   - Sign out → sign in again → confirm Passport skipped
5. **Create test credential** to validate returning-user and expired/revoked paths
6. **Confirm migration 050** (GT biometric thresholds) applied in production DB

---

## Re-run audit

```bash
npx tsx scripts/production-readiness-audit.ts
# Output: /opt/cursor/artifacts/production-readiness-audit.json
```

---

## Final verdict

**Code:** Deployed to production. Routes, APIs, auth gates, and UI are live.  
**Product:** NOT production ready. Zero active credentials. Full user journey untested. Veriff off. Manual IDV only.

**Recommendation:** Schedule a 30-minute live walkthrough with admin access and one test Google account. That single session closes 9 of 10 remaining gaps.
