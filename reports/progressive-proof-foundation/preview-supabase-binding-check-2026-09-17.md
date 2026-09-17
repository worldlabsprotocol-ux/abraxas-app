# Preview Supabase binding verification — PR #293 (2026-09-17)

**Target deployment:** `8f22eab5` on Preview  
**DEMO ref (audit target):** `ocntwbxarpjeixdnzide`  
**MAIN ref (must not be used for this audit):** `bztwutzprwsdrtqdpymf`

## HTTP probe status (this agent run)

| Check | Result |
|-------|--------|
| `VERCEL_PROTECTION_BYPASS` in runtime | **unset** (`printenv` length 0) |
| Vercel MCP | Auth timed out — cannot read Preview env vars or server logs |
| `POST /api/auth/zklogin/register` (no bypass) | Vercel Deployment Protection `401 Protected deployment` |
| `GET /api/preview/supabase-binding` | Not on `8f22eab5` (added in follow-up commit for full URL+key ref audit) |

**Conclusion:** Live server-side binding cannot be confirmed via HTTP in this run until bypass is available (fresh cloud agent run recommended).

## Corroborating evidence (no secrets printed)

| Signal | Finding |
|--------|---------|
| `docs/PR257_RELEASE_GATE.md` | Documents Vercel Preview sharing **staging** Supabase `bztwutzprwsdrtqdpymf` |
| DEMO Postgres logs (`ocntwbxarpjeixdnzide`) | **No** `sui_zklogin` / `42501` events `2026-09-16T18:00Z`–`2026-09-17T12:30Z` |
| DEMO edge logs | **No** zklogin / `sui_zklogin` REST paths in same window |
| First live register failure (`7c71ee21`) | HTTP 500 `Failed to save identity` — matches `service_role` INSERT denied on production/staging without migration `065` |
| DEMO grants (MCP SQL) | `service_role` INSERT/UPDATE on `sui_zklogin_identities` = **true** |

**Assessment:** Preview is **very likely still bound to MAIN/staging** (`bztwutzprwsdrtqdpymf`), not DEMO. Register traffic during the failed sign-in did not reach DEMO.

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

**Do not start Google sign-in** until binding probe passes. Restart interactive audit only after redeploy + probe PASS.
