# Build 862 — Authoritative sandbox execution

## Build identity

| Field | Value |
| --- | --- |
| Build | 862 |
| Commit | `407d271bbce6e85b0281031d82162ec64d03bbb3` |
| PR | [#862](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/862) |
| Preview | `https://abraxas-app-git-cursor-bu-7e7434-worldlabsprotocol-uxs-projects.vercel.app` (READY) |
| Branch | `cursor/build-862-authoritative-sandbox-execution-5ffe` |
| Base | `main` @ `f6234e1c` (includes merged #859, #860) |
| Supersedes | #861 UX polish (same Studio path; #862 adds server authority) |

## Phase 1 — Reconcile (#859 / #860 / #861)

| PR | Status | Notes |
| --- | --- | --- |
| #859 | **Merged** | Homepage nav only |
| #860 | **Merged** | Sandbox Step 2 account session onboarding |
| #861 | **Open** | Studio UX; folded into 862 branch via fast-forward merge |

No merge conflicts on `main` at reconciliation time. #861 Vercel preview reported **SUCCESS** (do not treat as production).

## Phase 2 — Server-side policy authority (implemented)

**Module:** `lib/partner/integrationStudio/provisionPolicyAuthority.ts`

- `resolveStudioPolicyTemplateId` — single catalog template; rejects conflicting `pack_id` vs `policy_template_id`.
- `clientPolicyIdOverrideRejected` — rejects body `policy_id` that does not match `buildLaunchpadPolicyId(partnerId, template)` (**403**).
- `assertAuthoritativeProvisionBinding` — after `provisionLaunchpadSandbox`, provisioned `partner_id` and `policy_id` must match session-derived tenant and catalog pin; else **400** `policy_template_invalid`.

**Wiring:** `createStudioSandbox` in `lib/partner/integrationStudio/createSandbox.ts` (existing route unchanged).

**Existing provision authority (reused, not duplicated):** `provisionLaunchpadSandbox` derives `policy_id` via `buildLaunchpadPolicyId` and passes `p_policy_id` to RPC (`lib/partner/launchpad/provisionSandbox.ts`).

**Client UX safeguard (861):** Integration Studio UI still blocks create when selected pack ≠ provisioned template; this is **not** an authorization boundary.

## Reused endpoints and services

- `POST /api/developers/integration-studio` → `createStudioSandbox` → `provisionLaunchpadSandbox`
- Launchpad partner console session cookie (`issuePartnerConsoleSessionToken`)
- Policy catalog: `buildLaunchpadPolicyId`, `resolveLaunchpadPolicyTemplate`
- Independent verifier: `lib/institutionalCertification/build546/independentVerifier.ts`
- Sandbox partner contract matrix: `lib/partner/sandboxPartnerContract/sandboxPartnerContract.test.ts`
- Staging browser journey (when configured): `tests/staging/integration-studio-provisioned-e2e.spec.ts`

## Automated test results (this environment)

| Suite | Result |
| --- | --- |
| `provisionPolicyAuthority.test.ts` | Pass (3) |
| `integrationStudioCreate.test.ts` | Pass (10) — override, forged pin, cross-tenant |
| `sandboxPartnerContract.test.ts` | Pass (16) — adversarial contract stages |
| `independentVerifierSteps.test.ts` | Pass (1) — synthetic crypto matrix |
| `adversarialCertification.test.ts` (546) | Pass (19) |
| `executeTrustExecutionAuthoritative.integration.test.ts` | **Skipped (5)** — requires live persistence / env gate |

Command: `./node_modules/.bin/vitest run lib/partner/integrationStudio/ lib/partner/sandboxPartnerContract/sandboxPartnerContract.test.ts lib/partner/build584/independentVerifierSteps.test.ts lib/institutionalCertification/build546/adversarialCertification.test.ts`

## Phase 3 — Live E2E partner journey

**Status:** **Partial on PR #862 Vercel preview** (`407d271b`); **not** full independent verification.

**Executed (preview + Playwright):**

- Policy → sandbox create → configuration: **pass** (application provisioned; inspector shows “ready in sandbox”).
- Harness request + receipt + independent verify: **blocked** — `POST /api/launchpad/auth/session` returns **503** `launchpad_not_configured` on preview despite successful create + API key (see `/opt/cursor/artifacts/build-862-preview-probes.log`).

**Blockers for completion criterion:**

1. Launchpad session/auth must be configured on the target host (Demo returns 401 for bad keys; preview returns 503).
2. Holder verification → signed receipt → `verifyReceiptIndependently` on that same environment (not mocked).

**Required to close gate:** Run `tests/staging/integration-studio-provisioned-e2e.spec.ts` (and holder-complete path if separate) with:

```bash
export LAUNCHPAD_STAGING_URL="https://<launchpad-connected-preview>"
export VERCEL_PROTECTION_BYPASS="<secret>"
npx playwright test tests/staging/integration-studio-provisioned-e2e.spec.ts
```

Distinguish: harness JSON response ≠ independent verifier success until receipt is verified via `verifyReceiptIndependently` / public `/verify` without trusting Studio local state.

## Phase 4 — Adversarial acceptance

**Reused (passing locally):** sandbox partner contract, Build 546 adversarial certification, Integration Studio create authority tests.

**Not re-run on live staging:** replay, revoked evidence, modified receipt against a real issuer in this environment.

## Phase 5 — User journey (desktop/mobile)

**Blocked** on live staging URL (same as Phase 3). Playwright spec covers desktop policy → create → configuration → harness request; mobile not in current spec.

## Security findings

| Control | Enforced server-side? |
| --- | --- |
| Tenant `partner_id` from session / studio nonce | Yes — body override rejected |
| Policy template from catalog | Yes — invalid template 400 |
| Client `policy_id` override | Yes — 403 |
| Provisioned row binding | Yes — post-provision assert |
| Callback allowlist | Existing provision path (`return_url_rejected`) |

**Remaining gaps:** Live proof that RPC cannot be tricked into a mismatched `policy_id` if database layer regresses; authoritative E2E + independent verify on staging; trust execution integration tests skipped without DB.

## Next technical priority

1. Run staging Playwright + one real holder verification that yields a receipt, then independent verify off-UI.
2. Unskip / run `executeTrustExecutionAuthoritative.integration.test.ts` against sovereign/staging Postgres.
3. Merge #862; close or supersede #861 explicitly.

## Completion criterion (founder)

**Not met in this delivery:** A real partner sandbox issuing a policy-bound receipt that an independent relying party verifies on authoritative infrastructure, with adversarial cases failing on that same environment.

**Met in this delivery:** Server-side policy continuity enforcement on Integration Studio create + regression tests; reconciliation of #859/#860/#861 scope.
