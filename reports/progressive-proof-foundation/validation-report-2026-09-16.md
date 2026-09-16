# PR #293 Validation Report

**Date:** 2026-09-16  
**Branch:** `cursor/progressive-proof-foundation-d541`  
**Deployed SHA (latest push):** `8f71a619`  
**Prior preview SHA:** `aaa2f5be` (Vercel deployment before security fix push)

## Summary

| Gate | Result |
|------|--------|
| `npm run build` | **PASS** (after `8f71a619` build fix) |
| Full test suite (`npm test --run`) | **PASS** — 3044 passed, 3 skipped |
| Progressive proof + security regressions | **PASS** — 31 tests |
| Good Trouble + tiered age assurance | **PASS** — 31 tests |
| CI (prior commit `aaa2f5be`) | **PASS** — 6/6 checks |
| CI (`8f71a619`) | Pending redeploy |
| DEMO Preview walkthrough | **BLOCKED** — Vercel Deployment Protection (SSO) |

## First failure

**Vercel Deployment Protection** on preview URL  
`https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app`  
All app routes redirect to Vercel login without `VERCEL_PROTECTION_BYPASS`.

## Confirmed defect fixed during validation

### `evaluate.ts` eligibility spoofing

**Issue:** Callers could pass `policyDecision: "approved"` + `missingClaims: []` without `heldClaims` and receive `uiState: "eligible"`.

**Fix:** When `computedMissing.length > 0`, empty `missingClaims` is overridden. When `heldClaims` is provided, gaps are always merged into `missing`. Handoff no longer accepts client-supplied `policyDecision`/`missingClaims`.

**Regression:** `lib/progressiveProof/evaluate.security.test.ts` (7 tests)

## Policy fail-closed (automated)

| Scenario | Result |
|----------|--------|
| `missingClaims: []` without held claims | `proof_needed` (not eligible) |
| Browse L0 claim vs retail policy | Denied / proof_needed |
| Browse claim wrong policy vs retail | Missing regulated claims |
| Expired browse claim | `expired` |
| Revoked browse claim | `denied` |
| Stocklana-like policy vs browse-only evidence | Missing wallet + liveness |
| Google sign-in never satisfies regulated claims | `providers.test.ts` |

## Build fix (`8f71a619`)

- Removed stale `ctx.policyRules` reference in `partnerFlowHandoff.ts`
- Replaced `[...new Set()]` with `Array.from(new Set())` for TS target compatibility

## Preview walkthrough (blocked)

Script: `scripts/progressive-proof/preview-validation.mjs`

| Step | Result |
|------|--------|
| Google sign-in, no document prompt | **BLOCKED** (Vercel SSO) |
| GT browse partner verify | **BLOCKED** (Vercel SSO) |
| GT retail stronger evidence copy | Partial — SSO page captured |
| Desktop/mobile screenshots | SSO login wall only |

Screenshots (SSO-blocked): `/opt/cursor/artifacts/screenshots/pr293-validation/`

## Rollout recommendation

1. Merge after CI green on `8f71a619`
2. Re-run preview walkthrough with `VERCEL_PROTECTION_BYPASS` against DEMO-bound preview
3. Manual Google OAuth sign-in on DEMO for browse DOB + retail IDV paths

**No MAIN Supabase changes. Not merged.**
