# Reproducible Verification Commands

All commands assume repository root with dependencies installed (`npm ci`).

**Reviewed baseline:** `origin/main` after PR #114 (`cabf83d` or later on `main`).

---

## 1. Static checks

```bash
# Install dependencies
npm ci

# ESLint (Next.js)
npm run lint

# TypeScript — no emit (also run in CI)
npx tsc --noEmit
```

**Expected:** lint and `tsc` exit 0 on `main`.

---

## 2. Full unit test suite

```bash
npm test
```

**Scope:** `lib/**/*.test.ts` via Vitest (`vitest.config.ts`).  
**Note:** 400+ tests at beta; full run is the regression baseline.

---

## 3. Targeted security-relevant tests

Run individually or as a block:

```bash
# Auth / zkLogin
npm test -- lib/auth/verifyZkLoginIdToken.test.ts lib/auth/zkloginRegisterRoute.test.ts

# Browser session + partner-flow routes
npm test -- lib/partner/partnerFlowRoutes.test.ts

# Receipt signing, validity, trust evaluation
npm test -- lib/decisionReceipts/decisionReceipts.test.ts \
  lib/decisionReceipts/validityResolver.test.ts \
  lib/decisionReceipts/trustEvaluation.test.ts

# Partner flow idempotency + audit (P1-2 / P1-3)
npm test -- lib/partner/partnerFlowIdempotency.test.ts \
  lib/partner/partnerFlowIdempotency.integration.test.ts \
  lib/partner/partnerFlowAudit.test.ts \
  lib/partner/partnerFlowAuditContract.test.ts \
  lib/partner/partnerFlowAuditEmission.test.ts \
  lib/partner/partnerFlowTraceAudit.test.ts \
  lib/partner/migration053RolloutSafety.test.ts \
  lib/partner/migration054AuditIndex.test.ts

# Return URL allowlist + public receipt validation
npm test -- lib/connect/returnUrlAllowlist.test.ts \
  lib/partner/verifyPartnerFlowReceipt.test.ts

# Partner API key auth + permissions
npm test -- lib/partner/partnerAuth.test.ts lib/verify/permissions.test.ts

# Admin auth
npm test -- lib/adminAuth.test.ts

# Integration preflight unit tests
npm test -- lib/integration/preflight.test.ts
```

**P1-3 consolidated block** (Partner Flow observability):

```bash
npm test -- lib/partner/partnerFlowAudit.test.ts \
  lib/partner/partnerFlowAuditContract.test.ts \
  lib/partner/partnerFlowTraceAudit.test.ts \
  lib/partner/partnerFlowRoutes.test.ts \
  lib/partner/partnerFlowIdempotency.integration.test.ts \
  lib/partner/partnerFlowAuditEmission.test.ts \
  lib/partner/migration054AuditIndex.test.ts
```

---

## 4. Gate scripts (artifact / deployment checks)

```bash
# Offline receipt signature fixture (no network)
npm run gate:verify-receipt-fixture

# Beta gate — optional live HTTP
BETA_GATE_BASE_URL=https://abraxasworld.xyz npm run gate:preflight

# Production readiness audit — optional live HTTP
AUDIT_BASE_URL=https://abraxasworld.xyz npm run audit:production
```

---

## 5. Integration preflight

Read-only configuration and drift checks. **Does not mutate** Supabase or call admin routes.

```bash
# Static checks only (no live HTTP / Supabase)
npm run integration:preflight
```

**Production probe** (Good Trouble pilot defaults):

```bash
INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz \
INTEGRATION_PREFLIGHT_PARTNER_ID=good-trouble-cannabis \
INTEGRATION_PREFLIGHT_POLICY_ID=good-trouble-retail-v1 \
INTEGRATION_PREFLIGHT_RETURN_URL=https://abraxasworld.xyz/good-trouble/enter \
npm run integration:preflight
```

**With live partner / allowlist validation** (read-only service role):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz \
INTEGRATION_PREFLIGHT_PARTNER_ID=good-trouble-cannabis \
INTEGRATION_PREFLIGHT_POLICY_ID=good-trouble-retail-v1 \
INTEGRATION_PREFLIGHT_RETURN_URL=https://abraxasworld.xyz/good-trouble/enter \
npm run integration:preflight
```

**Exit code:** `0` unless any check is **FAIL**. **PENDING** / **BLOCKED** do not fail CI.  
**Operator doc:** `docs/INTEGRATION_PREFLIGHT.md`.

---

## 6. Partner Flow trace audit (production)

Read-only audit of `audit_events` correlated by `flow_trace_id`. Requires service role (read `audit_events` only).

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
npm run audit:partner-flow-trace -- ft_vr_<verification_request_id>
```

**Example:**

```bash
npm run audit:partner-flow-trace -- ft_vr_00000000-0000-4000-8000-0000000000aa
```

**Output:** JSON with `status` (`PASS`/`FAIL`), `correlation_ok`, `sequence_ok`, `linkage_ok`, `pii_ok`, `issues`, and event summary.

**Prerequisite:** Migration `054_partner_flow_audit_index.sql` applied in target environment (index on `metadata->>'flow_trace_id'`).

**Analyzer implementation:** `lib/partner/partnerFlowTraceAudit.ts`.

---

## 7. Live API smoke (manual, optional)

These require browser session or partner credentials — not automated in this package.

| Check | Endpoint |
|-------|----------|
| Signing configured | `GET https://abraxasworld.xyz/api/trust/status` |
| Public JWKS / key | `GET https://abraxasworld.xyz/api/credentials/public-key` |
| Public receipt (capability URL) | `GET https://abraxasworld.xyz/api/receipts/{receipt_id}/public` |
| OpenAPI contract | `GET https://abraxasworld.xyz/api/v1/openapi.json` |

Record **deployed commit SHA** at review time and compare to local `git rev-parse HEAD`.

---

## 8. CI reference

GitHub Actions workflow: `.github/workflows/ci.yml`  
Typical CI steps: `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test`.
