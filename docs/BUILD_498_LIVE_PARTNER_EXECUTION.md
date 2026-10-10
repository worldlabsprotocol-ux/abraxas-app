# Build #498 — Live partner execution & trust boundaries

**Depends on:** Build #497 merged (PR #610) — `universal_readiness`, independent partner contract proof.

## Phase 1 — Repository audit summary

| Area | Live wiring | Gap severity |
|------|-------------|--------------|
| Partner Flow evaluate/complete | Yes — requires **browser session** (holder) | High for headless E2E |
| Public receipt trust | Yes — `GET /api/receipts/{id}/public` + partner-kit trust | Medium — needs real `dr_*` from sandbox run |
| Launchpad tenant scope | Yes — `getLaunchpadApplicationForPartner` on routes | Low — regression tests added |
| Universal readiness UI | **This build** — `PartnerUniversalReadinessPanel` | — |
| Live sandbox harness | **This build** — `npm run partner:live-sandbox` | Partial until receipt id provided |
| Webhook failure semantics | Existing outbox + DLQ | Medium — injection tests document behavior |
| Commercial metering | `partner_api_usage` + metering hooks | Medium — no invoice reconciliation |

## Phase 2 — Live independent partner execution

**Command:** `npm run partner:live-sandbox`

**Required env:** `PARTNER_FLOW_RP_PARTNER_ID`, `PARTNER_FLOW_RP_POLICY_ID`, `PARTNER_FLOW_RP_RETURN_URL`, `PARTNER_FLOW_RP_BASE_URL`

**Optional:** `EXAMPLE_MERCHANT_LIVE_RECEIPT_ID` — after a **real** sandbox holder run, verifies trust via live public receipt API (not fixtures).

**Explicitly blocked without browser:** holder authentication, policy evaluation, receipt issuance (`holder_flow` stage).

**Exit codes:** `0` = infrastructure + live receipt trust pass; `2` = partial (infra ok, receipt not provided); `1` = blocked.

## Phase 3 — Readiness UI

Launchpad **Advanced** section: `PartnerUniversalReadinessPanel` loads `/api/launchpad/applications/:id/health` with `cache: no-store`, displays `universal_readiness.phase`, blockers, signals, and next actions. Does not treat starter kit as verified.

## Phases 4–9 — In this slice

- **Tenant isolation:** `launchpadTenantIsolationRoute.test.ts` (health + integration-health 404 cross-tenant).
- **Receipt trust / reuse:** existing `universalIntegration.test.ts` matrix + live receipt stage when env set.
- **Webhook failures:** `webhookFailureInjection.test.ts` (backoff, DLQ, idempotency keys, PII guard).
- **Metering:** `commercialMeteringAudit.ts` static report (no payment processing).
- **Evidence matrix:** `readinessEvidenceMatrix.ts` + printed in live-sandbox script.

## Staging runbook

1. Provision Example Merchant (or any) sandbox app in Launchpad; pin policy; set HTTPS callback.
2. Export `PARTNER_FLOW_RP_*` from integration docs (never commit secrets).
3. Run `npm run partner:universal-readiness` (offline + conformance).
4. Run `npm run partner:live-sandbox` against staging base URL.
5. Complete holder verification in browser (manual).
6. Set `EXAMPLE_MERCHANT_LIVE_RECEIPT_ID=dr_…` from callback; re-run `partner:live-sandbox`.
7. Confirm Launchpad readiness panel shows `sandbox_verified` only after server events — not before live receipt.

## Validation (executed on branch)

```bash
./node_modules/.bin/vitest run lib/partner/universalIntegration lib/partner/partnerConformanceHarness.test.ts lib/policy/changeControl/changeControlHealthRoute.test.ts
# 8 files, 28 tests passed

npm run build   # placeholder Supabase env as in CI
npm run partner:live-sandbox   # requires tsx devDependency; exit 1 when PARTNER_FLOW_RP_* unset (expected in CI)
```

**Live E2E in cloud agent VM:** blocked without staging `PARTNER_FLOW_RP_*` and browser holder session; harness reports `overall: blocked` explicitly.

## Build #499 recommendations (ranked)

1. Playwright staging walkthrough binding `LAUNCHPAD_STAGING_URL` + saved session to automate holder steps.
2. Cross-tenant negative tests on Partner Flow evaluate with wrong `partner_id` / policy pin mismatch.
3. Launchpad banner when `live_e2e_complete` false but phase is `sandbox_verified` (harness vs live).
4. Webhook delivery failure injection against test endpoint with signed payload verification.
5. Metering reconciliation export spec + admin read API audit.
