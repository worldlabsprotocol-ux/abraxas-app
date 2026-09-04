# Good Trouble ↔ Abraxas End-to-End Journey Audit

**Date:** 2026-09-04  
**Base:** `origin/main` @ `aa31c2aa` (commercial cleanup merged)  
**Scope:** Partner Flow pilot for `good-trouble-cannabis` / `good-trouble-retail-v1`

---

## 1. Journey map (code path)

| Step | Route / function | File |
|------|------------------|------|
| Wix age gate entry | `AgeVerificationPopup.js` → `createPopupController` | `examples/good-trouble-wix/pages/AgeVerificationPopup.js`, `ageVerificationPopupLogic.js` |
| Wix backend start | `buildVerificationStartPayload()` | `examples/good-trouble-wix/backend/nonceLifecycle.js:67-99` |
| Abraxas entry | `GET /partner/verify` | `app/partner/verify/page.tsx` → `PartnerVerifyClient.tsx` |
| Resume save | `savePartnerVerifyResume()` | `lib/partner/partnerVerifyResume.ts:169-181` |
| OAuth start | `handleSignIn()` → `signInWithGoogle()` | `PartnerVerifyClient.tsx:263-291` |
| OAuth state mint | `POST /api/auth/zklogin/login-state` | `app/api/auth/zklogin/login-state/route.ts` |
| OAuth callback | `completePartnerVerifyOAuthCallback()` | `lib/partner/partnerVerifyOAuthCallback.ts:28-76` |
| Browser session | `ensureBrowserSessionReady()` | `lib/auth/ensureBrowserSession.ts` |
| Policy evaluate | `POST /api/v1/partner-flow/evaluate` → `evaluatePartnerFlow()` | `app/api/v1/partner-flow/evaluate/route.ts`, `lib/partner/relyingPartyFlow.ts:437-540` |
| Evidence step | `buildPartnerEvidenceUrl()` → `/partner/continue` | `lib/partner/relyingPartyFlow.ts:90-105`, `app/partner/continue/page.tsx` |
| Receipt issue | `issuePartnerSessionReceipt()` | `lib/partner/relyingPartyFlow.ts:190-418` |
| Partner redirect | `buildRedirectUrl()` | `lib/connect/returnUrlAllowlist.ts` |
| Wix callback | `AgeVerificationResult.js` → `completeAbraxasVerification` | `examples/good-trouble-wix/pages/AgeVerificationResult.js` |
| Receipt validate | `fetchAndValidateSandboxReceipt()` | `examples/good-trouble-wix/backend/abraxasReceiptValidator.js` |
| Public receipt API | `GET /api/receipts/{id}/public` | `app/api/receipts/[receiptId]/public/route.ts` |

---

## 2. Registered configuration

| Item | Value | Source |
|------|-------|--------|
| `partner_id` | `good-trouble-cannabis` | `lib/goodTrouble/constants.ts`, migration `049` |
| `policy_id` | `good-trouble-retail-v1` | migration `049`, `051` |
| Return URLs (Abraxas-hosted) | `/good-trouble/enter`, preview hosts | migrations `051`, `052` |
| Wix return URL | `https://www.goodtroublecanna.com/age-verification-result` | `examples/good-trouble-wix/backend/constants.js:7` — **must be operator-allowlisted** |
| Session receipt TTL | 24h | migration `051` |
| Policy mode | `sandbox_only: true` | migration `049` |

### Environment variables (Abraxas)

- `NEXT_PUBLIC_APP_URL`, `ABRAXAS_ISSUER_URL` — origin / issuer
- `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY` — receipt signing
- `ABRAXAS_BROWSER_SESSION_SECRET` — browser session JWT
- `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID`, `GOOGLE_ZKLOGIN_CLIENT_ID` — OAuth
- `PARTNER_FLOW_DEMO_MODE` — demo only; blocked in production (`lib/partner/partnerFlowDemoMode.ts`)

---

## 3. Assurance boundary (findings)

| Risk | Status | Evidence |
|------|--------|----------|
| Auth mistaken for age verification | **Mitigated** | `lib/partner/assuranceBoundary.ts`; partner UI copy in `PartnerVerifyShell.tsx`, `partnerVerifyDisplay.ts` |
| Token/AXPROOF bypass | **Blocked by design** | `TOKEN_HOLDINGS_NEVER_ELIGIBILITY` in `assuranceBoundary.ts` |
| URL `status=approved` trusted | **Blocked** | Wix `AgeVerificationResult.js:9-18` — receipt required; `pilotTrustBoundary.test.js` |
| Sandbox receipt in production | **Fail-closed** | `verifyPartnerFlowReceipt.ts` mode `production`; Wix validator `RECEIPT_VALIDATION_MODE=sandbox` |
| Cross-partner receipt | **Fail-closed** | `verifyPartnerFlowReceipt.ts` partner/policy binding |
| Open redirect | **Fail-closed** | `isReturnUrlAllowed()` in `lib/connect/returnUrlAllowlist.ts` |
| PII in callback URL | **Frozen params only** | `lib/protocol/compatibility.ts` `PARTNER_CALLBACK_PARAMS` |

**Honest pilot note:** Good Trouble retail policy requires L2 identity claims (`retailEligibility.ts:13-18`). Traditional Wix “Yes, I’m 21+” is **self-attestation only** (`ageVerificationPopupLogic.js:6-8`) — not Abraxas authoritative evidence.

---

## 4. Failure modes (before this PR)

| Failure | Root cause | Mitigation in this PR |
|---------|------------|----------------------|
| Stranded on Abraxas after OAuth | Resume TTL / missing resume | Existing `partnerVerifyResume.ts`; auto-evaluate on `partner_auth=ready` |
| Developer dashboard during partner flow | Redirect to `/passport` | `/partner/continue` + passport redirect guard |
| Technical UI (policy ID, 3-step rail) | `PartnerVerifyShell` institutional design | Customer `PartnerJourneyLayout` |
| Lost Good Trouble destination | Wix callback showed success only | `RETURN_DESTINATION_STORAGE_KEY` restoration |
| Ambiguous denial copy | Generic “policy requirement” | Journey state messages |
| Blocked auto-return | `window.location` failures silent | `return_failed` state + partner return button |
| No authoritative journey state | Ad-hoc `PartnerVerifyPhase` only | `partnerJourneyStateMachine.ts` + API enrichment |

---

## 5. State machine (authoritative)

States: `request_received` → `sign_in_required` → `sign_in_in_progress` → `session_ready` → `evaluating_policy` → (`additional_verification_required` \| `manual_review_required` \| `approved` \| `denied`) → `returning_to_partner` \| `return_failed`

Implementation: `lib/partner/partnerJourneyStateMachine.ts`  
API enrichment: `lib/partner/enrichPartnerFlowResponse.ts` on evaluate/complete routes

---

## 6. Agent tool boundary

Route: `POST /api/v1/partner-flow/agent/inspect`  
Logic: `lib/partner/partnerProofAgent.ts`  
Agent may inspect policy/evidence; may **not** issue receipts, override policy, or accept token holdings as evidence.

---

## 7. Manual production steps still required

1. Allowlist `https://www.goodtroublecanna.com/age-verification-result` on partner row (not in migrations yet — see `docs/GOOD_TROUBLE_WIX_SANDBOX.md`)
2. Publish policy v2 with `product_eligibility` when ready (migration `076` draft)
3. Deploy Wix Velo reference files to Good Trouble site
4. Do **not** enable `PARTNER_FLOW_DEMO_MODE` in production
