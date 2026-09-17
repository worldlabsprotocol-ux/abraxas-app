# Preview Supabase binding verification — PR #293 (2026-09-17)

**Target deployment:** `7f5f9e1c` on Preview (includes `/api/preview/supabase-binding`)  
**Prior deployments:** `9a644873` (probe route), `8f22eab5` (register RCA)  
**DEMO ref (audit target):** `ocntwbxarpjeixdnzide`  
**MAIN ref (must not be used for this audit):** `bztwutzprwsdrtqdpymf`

## HTTP probe status (run 2 — bypass present)

| Check | Result |
|-------|--------|
| `VERCEL_PROTECTION_BYPASS` in runtime | **present** (non-empty; not printed) |
| `GET /api/preview/supabase-binding` (header-only bypass) | **HTTP 200** `all_match_demo: true` |
| URL / anon / service-role refs | all `ocntwbxarpjeixdnzide` |
| `production_ref_detected` | `false` |
| Google sign-in | **not started** (mismatch gate cleared) |

**Conclusion:** Live Preview is bound to DEMO. See `preview-supabase-binding-probe-2026-09-17-run2.md`.

## Corroborating evidence (no secrets printed)

| Signal | Finding |
|--------|---------|
| `docs/PR257_RELEASE_GATE.md` | Documents Vercel Preview sharing **staging** Supabase `bztwutzprwsdrtqdpymf` |
| DEMO Postgres logs (`ocntwbxarpjeixdnzide`) | **No** `sui_zklogin` / `42501` events `2026-09-16T18:00Z`–`2026-09-17T12:30Z` |
| DEMO edge logs | **No** zklogin / `sui_zklogin` REST paths in same window |
| First live register failure (`7c71ee21`) | HTTP 500 `Failed to save identity` — matches `service_role` INSERT denied on production/staging without migration `065` |
| DEMO grants (MCP SQL) | `service_role` INSERT/UPDATE on `sui_zklogin_identities` = **true** |

**Assessment (superseded by run 2 live probe):** Historical signals above explained the `7c71ee21` register 500. Live Preview SHA `7f5f9e1c` now reports all three refs = DEMO. The docs note that Preview *can* share staging remains a process warning, not the current binding.

## Required Vercel Preview configuration (Preview scope only)

Set under **Vercel → abraxas-app → Settings → Environment Variables → Preview** (check branch overrides for `cursor/progressive-proof-foundation-d541` / PR #293):

| Variable | Must resolve to DEMO |
|----------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ocntwbxarpjeixdnzide.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT `ref` = `ocntwbxarpjeixdnzide` |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT `ref` = `ocntwbxarpjeixdnzide` |

**Do not change Production env** (MAIN). Redeploy Preview after saving.

## Verification after env fix (automation; no Google sign-in)

```bash
PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
VERCEL_PROTECTION_BYPASS=<header-only> \
npx tsx scripts/progressive-proof/probe-preview-supabase-binding.ts
```

Expect `all_match_demo: true` and `production_ref_detected: false`.

On `8f22eab5` only (URL gate):

```bash
npx tsx scripts/progressive-proof/probe-zklogin-register.ts
```

Expect **401** (invalid probe token), **not** 503 `preview_supabase_not_demo_bound`.

## Interactive audit

Binding probe **PASS** on `7f5f9e1c`. Google sign-in was **not started** in run 2 (explicit stop-after-mismatch instruction; no mismatch occurred). Interactive walkthrough is now unblocked.
