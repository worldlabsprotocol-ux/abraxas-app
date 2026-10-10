# Build #512 — Real user journey acceptance

**Branch:** `cursor/real-user-journey-acceptance-512-5ffe`  
**Stacked on:** PR #624 (Build #511)

## PASS / FAIL / BLOCKED / NOT RUN matrix

| Area | Result | Evidence |
|------|--------|----------|
| Homepage guard | PASS | `npm run check:homepage-guard` |
| Unit: reuse server mapping | PASS | `lib/holder/evidenceReuseFromServer.test.ts` |
| Unit: auto-evaluate guard | PASS | `lib/partner/partnerAutoEvaluateGuard.test.ts` |
| Unit: error presentation | PASS | `lib/partner/holderFlowErrorPresentation.test.ts` |
| Playwright: judge tour (simulated) | PASS | `tests/ux/judge-tour.spec.ts` |
| Playwright: partner preview (mocked) | PASS | `tests/ux/holder-journey-preview.spec.ts` |
| Live Phantom → receipt E2E | **BLOCKED** | No Demo holder session / wallet in agent VM |
| Live Cielo / GT continuation | **BLOCKED** | Requires Demo Supabase + partner callbacks |
| Core Web Vitals on Demo URL | **NOT RUN** | No production/demo URL measurement in VM |
| Demo preflight (read-only) | **BLOCKED/WARN** | `npm run preflight:build512-demo` — needs Demo env vars |

## Shipped hardening

1. **Server reuse hint** on `POST /api/v1/partner-flow/evaluate` → `evidence_reuse_hint` (from `resolveCompatibleReusableFact`; consent always false at evaluate).
2. **Holder matrix bridge** — `lib/holder/evidenceReuseFromServer.ts` maps server reuse state to Build #511 holder messages.
3. **Auto-evaluate guard** — `partnerAutoEvaluateGuard.ts`; no `evaluateOnceRef` reset before auto-run; wallet subject change clears refs; blocked on terminal phases.
4. **Visible failures** — correlation / flow trace on partner errors; `flowNextStepHint` + support ref in `VerificationFailure`.
5. **Demo preflight script** — `npm run preflight:build512-demo` (read-only, wraps Solana demo preflight).

## Click counts (mocked / local)

| Journey | Clicks | Notes |
|---------|--------|-------|
| Judge tour (simulated) | ~8 | Unchanged from #511 |
| Partner denied (preview) | 0 | Mocked phase only |
| Returning holder live partner | — | **BLOCKED** |

## Homepage proposal (guard — not applied)

See `docs/BUILD_512_HOMEPAGE_PROPOSAL.md`. Requires founder `[ui-change]` approval.

## Rollback

- Revert evaluate `evidence_reuse_hint` attachment.
- Revert `PartnerVerifyClient` auto-evaluate guard (restore prior effect if needed).
- Remove preview Playwright spec if preview env disabled.

## Founder actions

1. Run `npm run preflight:build512-demo` on Demo deploy with migrations 134–138 applied.
2. Execute live Cielo + Good Trouble handoff on Demo with Phantom (founder-tested wallet).
3. Approve homepage proposal for judge tour discoverability.
