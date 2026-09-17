# Preview Supabase binding probe — PR #293 (2026-09-17, run 2)

**PR:** [#293](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293) (`cursor/progressive-proof-foundation-d541` → `main`) — **unmerged**  
**Cloud agent:** `bc-aca75cd0-6e1a-48bf-8c99-a1790f3dc2c0`  
**Preview URL:** `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app`  
**Deployed SHA:** `7f5f9e1c4bf41805ca09164bbb97fb432fc53ec4`  
**DEMO ref (required):** `ocntwbxarpjeixdnzide`  
**MAIN ref:** `bztwutzprwsdrtqdpymf` — **not queried, not modified**  
**Production / `abraxas-app.vercel.app`:** **not requested, not probed, not modified**

## Gate 0 — `VERCEL_PROTECTION_BYPASS`

| Check | Result |
|-------|--------|
| Present in this run | **yes** (non-empty; value not printed) |
| Length class | 32-character automation secret (not a JWT) |
| Transport | header `x-vercel-protection-bypass` only |

## Live probe result — `GET /api/preview/supabase-binding`

Header-only bypass (no `x-vercel-set-bypass-cookie`). Response `Cache-Control: no-store`. No key material in body.

```json
{
  "status": 200,
  "vercel_env": "preview",
  "deployment_sha": "7f5f9e1c4bf41805ca09164bbb97fb432fc53ec4",
  "demo_project_ref": "ocntwbxarpjeixdnzide",
  "url_project_ref": "ocntwbxarpjeixdnzide",
  "anon_key_project_ref": "ocntwbxarpjeixdnzide",
  "service_role_key_project_ref": "ocntwbxarpjeixdnzide",
  "url_matches_demo": true,
  "anon_key_matches_demo": true,
  "service_role_matches_demo": true,
  "all_match_demo": true,
  "production_ref_detected": false,
  "missing": []
}
```

| Field | Required | Observed | Match |
|-------|----------|----------|-------|
| URL project ref | `ocntwbxarpjeixdnzide` | `ocntwbxarpjeixdnzide` | **PASS** |
| Anon key JWT `ref` | `ocntwbxarpjeixdnzide` | `ocntwbxarpjeixdnzide` | **PASS** |
| Service-role JWT `ref` | `ocntwbxarpjeixdnzide` | `ocntwbxarpjeixdnzide` | **PASS** |
| `all_match_demo` | `true` | `true` | **PASS** |
| `production_ref_detected` | `false` | `false` | **PASS** |

**Verdict: PASS.** Preview is bound to DEMO on URL, anon key, and service-role key.

Official script (after header-only fix) reproduces the same JSON:

```bash
PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
npx tsx scripts/progressive-proof/probe-preview-supabase-binding.ts
```

Corroborating URL gate (no OAuth): `POST /api/auth/zklogin/register` with dummy token → **HTTP 401** `Invalid id_token` (not 503 `preview_supabase_not_demo_bound`).

## Probe script note

The documented `npx tsx scripts/progressive-proof/probe-preview-supabase-binding.ts` command initially failed with `redirect count exceeded`. Vercel answers `x-vercel-set-bypass-cookie: true` with **307** to the same path plus `_vercel_jwt`; Node `fetch` has no cookie jar, so it loops.

Working request: **bypass header only** (`setCookie: false`). Follow-up commit on this PR makes the probe scripts use that path.

## Google sign-in

**Not started.** Binding mismatch gate is cleared (`all_match_demo: true`). Interactive Google walkthrough remains a separate step and was not run in this agent.

## Safety

- Did not merge PR #293
- Did not change Production env or Production deployment
- Did not query or modify MAIN Supabase (`bztwutzprwsdrtqdpymf`)
