# Beta Gate Evidence Matrix

**Last updated:** 2026-08-05  
**Phase:** Protocol Validation  
**Prerequisite:** Reconciliation doc `docs/INTEGRATION_READINESS_RECONCILIATION.md` — IAT and beta tag **not complete**.

---

## Prerequisite status

| Check | Status | Evidence |
|-------|--------|----------|
| PR #101 merged to `main` | **Pending** | `main` at `f1cad49` does not include `residency_country` issuance |
| Production SHA matches merge | **Unknown** | Operator must record Vercel deploy SHA |
| Migrations 049–051 applied | **Unknown** | Operator confirms in Supabase |

---

## Gate matrix

| Gate | Current implementation | Required objective evidence | Verification command / procedure | Status | Validated gaps | Follow-up owner |
|------|------------------------|---------------------------|----------------------------------|--------|----------------|-----------------|
| **IAT** | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`, `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` | Signed results doc: Scenarios A–D PASS, decision_id + receipt_id + screenshots, 0 critical/high defects | Human: execute checklist on production. Pre-check: `npm run gate:preflight` with `BETA_GATE_BASE_URL=https://abraxasworld.xyz` | **Pending** | Production IAT not executed; PR #101 not on production `main` | Operator / founder |
| **Protocol compatibility freeze** | `docs/PROTOCOL_COMPATIBILITY.md`, `lib/protocol/compatibility.ts`, `lib/protocol/compatibility.test.ts` | Doc committed at release SHA; **live-output** compatibility tests pass; live IAT receipt `signature_valid: true` | `npm test -- lib/protocol/compatibility.test.ts` · `npm run gate:verify-receipt-fixture` | **Partial** | Live-output tests pass locally; production IAT receipt not yet captured | Engineering + operator |
| **P1-1 Immutable policy versions** | `055_policy_immutable_versions.sql`, `lib/policy/policyLifecycle.ts`, `policyVersioning.ts`, `getPartnerPolicyAtVersion()` | DB trigger blocks `rules_json` mutation on active/deprecated rows; operator draft→publish workflow; decisions/receipts pin `policy_id`+`policy_version`; historical replay via version lookup | `npm test -- lib/policy/policyLifecycle.test.ts lib/policy/policyImmutability.test.ts lib/policy/policyHistoricalReproducibility.test.ts lib/partner/partnerFlowTraceAudit.test.ts` | **Live (code)** — migration 055 operator apply pending | `getDecisionStatus()` still re-evaluates live policy (P1-2); rules not embedded in receipt artifact | Engineering + operator |
| **P1-2 Trust Decision validity** | `evaluateDecisionReceiptTrust`, idempotency keys, 409 on conflict | Fixture + integration tests pass; production IAT receipt pending | `npm test -- lib/decisionReceipts/trustEvaluation.test.ts lib/partner/partnerFlowIdempotency.integration.test.ts` | **Live (code)** — human IAT evidence pending | Migration 053 applied in prod |
| **P1-3 Observability / audit** | `partnerFlowAuditContract`, `partnerFlowTraceAudit`, `audit:partner-flow-trace` | Route-level audit + trace analyzer merged; production trace run pending | `npm test -- lib/partner/partnerFlowTraceAudit.test.ts` · `npm run audit:partner-flow-trace -- ft_vr_<id>` | **Live (code)** — operator trace audit pending | Migration 054 applied in prod |
| **Integration preflight** | `scripts/integration-preflight.ts`, `docs/INTEGRATION_PREFLIGHT.md` | Static + optional live/Supabase checks | `npm run integration:preflight` | **Live** | — |
| **External security review** | `docs/external-security-review/` readiness package | Independent written report; Critical/High disposition in `RELEASE_DECISION.md` | See `docs/external-security-review/REPRO_COMMANDS.md` | **Blocked** — readiness only, **no review performed** | Security / founder |
| **v1.0.0-beta.0 baseline tag** | `docs/RELEASE_DECISION.md`, Known Good Baseline template below | All gates above passed; regression suite green; signed release decision | See release checklist below — **do not run tag command until gates pass** | **Pending** | IAT, compatibility sign-off, external review | Founder |

---

## IAT — step evidence map

| Step | Endpoint / component | Expected evidence | Failure diagnostics |
|------|---------------------|-------------------|---------------------|
| Google zkLogin | OAuth + `POST /api/auth/zklogin/register` | `GET /api/auth/zklogin/me` → 200; `abraxas_browser_session` cookie | 401 on partner-flow; check Google OAuth env, JWKS |
| Browser session | `POST /api/auth/browser-session` | Cookie present; protected routes not 401 | `ABRAXAS_BROWSER_SESSION_SECRET` missing |
| Partner evaluate | `POST /api/v1/partner-flow/evaluate` | `next: passport` or `enter`; `flow_trace_id` = `ft_vr_{verification_request_id}` when passport path | `reason_codes`, `missing:*` in denied; check claims |
| Verification request | `createVerificationRequest` | `verification_request_id` in passport URL | Policy ownership error → wrong partner/policy |
| Consent | `GET/POST /api/v1/verification-requests/{id}/consent` | Consent ceremony completes | 400 on consent → session/request mismatch |
| Document capture | `POST /api/identity/documents/capture` | 200 or auto-approve JSON | 422 → biometric reasons in response |
| Admin approval | `POST /api/admin/identity/approve` | `jti` in response | 500 → signing key or Supabase |
| Claim issuance | `issueIdentityCredential` | `credential_claims` includes `residency_country` | Denied at evaluate → missing claim (PR #101) |
| Policy evaluation | `evaluatePolicyForSubject` | `decision: approved` | `missing:residency_country` pre-#101 |
| Trust Decision | `verification_decisions` row | `decision_id` in API response | No row → receipt issuance failed |
| Signed receipt | `decision_receipts` + `dr_*` | `GET /api/receipts/{id}/public` → `signature_valid: true` | Signing key misconfig |
| Partner callback | `PartnerFlowReturnHandler` → `/complete` | Redirect to `/good-trouble/enter` with callback params | Silent failure if `/complete` errors — check network tab |

**Full procedure:** `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`

---

## Backend smoke checks (pre-IAT, ~30 min)

```bash
# 1. Regression + gate scripts (local)
npm run gate:preflight
BETA_GATE_BASE_URL=https://abraxasworld.xyz npm run gate:preflight

# 2. Production probes (unauthenticated)
npm run audit:production

# 3. Confirm deploy SHA matches merge commit
# Vercel dashboard → deployment → Git SHA

# 4. Signing + metrics
curl -s "https://abraxasworld.xyz/api/trust/status?sui=0x1234..." | jq .infrastructure.signing_configured
curl -s "https://abraxasworld.xyz/api/metrics/public" | jq .metrics.active_credentials
```

---

## Known Good Baseline (record after IAT pass — do not pre-fill)

| Item | Value |
|------|-------|
| Merged commit SHA | _pending_ |
| Deployed production SHA | _pending_ |
| Tag | `v1.0.0-beta.0` (not created) |
| Tests | _record count at tag_ |
| IAT | _Pass / Fail_ |
| Critical defects | _0 required_ |
| High defects | _0 required_ |
| Environment | Production (`abraxasworld.xyz`) |
| Date | _sign-off date_ |

---

## v1.0.0-beta.0 release checklist (do not execute until ready)

- [ ] PR #101 merged and deployed (SHA match)
- [ ] `npm test` — 100% pass at release SHA
- [ ] `npm run gate:preflight` with production URL — no failures
- [ ] IAT results signed in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`
- [ ] `docs/PROTOCOL_COMPATIBILITY.md` marked complete
- [ ] `docs/RELEASE_DECISION.md` signed
- [ ] External security review disposition recorded (or explicit deferral with risk acceptance)
- [ ] Known Good Baseline table above filled

**Future tag command (do not run until checklist complete):**

```bash
git tag -a v1.0.0-beta.0 -m "Canonical baseline: IAT passed, contract frozen, pre-P1"
git push origin v1.0.0-beta.0
```

---

## Confidence

| | |
|---|---|
| **Backend correctness** | High (code + integration tests on PR #101 branch) |
| **Evidence source** | Static audit · Regression tests · Integration tests · Gate scripts |
| **Not yet validated** | Production deployment · Production IAT · External security review |
| **Known assumptions** | PR #101 merged to production · Migrations 049–051 · Signing + session secrets configured |

---

## Runnable commands (added in this branch)

| Command | Purpose |
|---------|---------|
| `npm run gate:preflight` | Local + optional production smoke |
| `npm run gate:verify-receipt-fixture` | Operator receipt sign/verify/tamper |
| `npm test -- lib/protocol/compatibility.test.ts` | Compatibility contract tests |
| `npm test -- lib/decisionReceipts/validityResolver.test.ts` | Validity negative tests |
| `npm test -- lib/partner/partnerFlowAudit.test.ts` | Partner-flow audit metadata + persistence |
| `npm test -- lib/partner/partnerFlowRoutes.test.ts` | Shared flow_trace_id across evaluate/complete/refresh |
