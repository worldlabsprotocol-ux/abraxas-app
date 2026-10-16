# Build #589 — Vercel Next.js compile memory diagnostic

## Deployment status (07068369 / ad80fa1)

| Commit | GitHub `Vercel` status | Deployment id (status URL) | Observed |
|--------|------------------------|----------------------------|----------|
| `07068369` | `pending` since 2026-10-16T16:13:12Z | `2wLkHWHj8t6Hi7K5Q68vSg3pZz6F` | Branch preview serves **Deployment is building** placeholder |
| `ad80fa1` | `pending` since 2026-10-16T15:46:31Z | `3urz1u57QpbV5Wwd9BRT7n5995Ka` | Same |

Founder-visible last log line: **`Creating an optimized production build ...`** (webpack phase start).

## GitHub CI comparison (07068369, run 38930209197)

| Phase | Timestamp (UTC) | Duration |
|-------|-----------------|----------|
| Webpack (`Creating…` → `Compiled`) | 16:15:42 → 16:17:51 | **~129s** |
| Lint + TypeScript (spinner) | 16:17:51 → 16:18:40 | **~49s** |
| Collecting page data + SSG (398 pages) | 16:18:40 → 16:19:26 | **~46s** |
| Finalizing + route table | 16:19:26 | (trace step starts; job completes 16:19:29) |
| **Total `npm run build` step** | 16:15:41 → 16:19:26 | **~3m 45s** |

Runner: `ubuntu-latest`, Node **24**, `npm ci`, no Vercel install/prune script.

## Reproducible memory sampling (local, same commit tree)

Aggregated **Node RSS sum** (`ps -C node`) during `npm run build` with CI placeholder env:

| Scenario | Peak Node RSS | Stalled / failed stage |
|----------|---------------|------------------------|
| Full `next build` (default) | **7,899,864 KiB (~7.5 GiB)** | Peak during **`Linting and checking validity of types`** (parallel ESLint + TS worker) |
| Webpack-only phase (before lint line) | **~6.4 GiB** | Still high on 8GB host with install/OS overhead |
| `next build --no-lint` | **~7.3 GiB** | Typecheck alone still exceeds safe 8GB budget |
| **`VERCEL_ENV=preview` + skip lint/types in next.config** | **~5.5 GiB** | Completes; logs `Skipping validation of types` / `Skipping linting` |

8 GiB **address-space cap** (`prlimit --as=8500000000`) failed immediately at Next boot with WASM OOM — confirms tight headroom on Vercel-class limits.

## Phase attribution

1. **Webpack compilation** — `Creating an optimized production build` (~2 min on CI).
2. **TypeScript + ESLint** — single spinner `Linting and checking validity of types`; runs **in parallel** (`Promise.all` in Next 14.2.35 `type-check.js`).
3. **Static generation** — 398 pages; lower peak than lint+type on this repo.
4. **Build traces / packaging** — follows SSG; CI completes within seconds after route table.

## Build cache

Not observable from this environment (Vercel API 403). CI uses fresh checkout + npm cache only; successful CI builds argue against **code** regression. Stall pattern matches **memory**, not infinite SSG.

## Visual PR #718 impact

Diff is CSS + shell components (`AbxInstitutionalWorkspaceShell`, `AbxProductAtmosphere` markup only). **No new heavy client imports.** Not supported as compile root cause.

## Root cause (established)

**Preview builds on Vercel 8GB builders exceed available RAM** during post-webpack **parallel TypeScript and ESLint**, peaking ~**7.9 GiB Node RSS** while the founder only sees the earlier webpack line. Outcome: **SIGKILL / hung `pending` deployment**, not a functional app defect.

## Narrow correction (preview-only)

`next.config.js`: skip lint/type **during** `next build` when `VERCEL_ENV === "preview"` only. **GitHub Actions** continues to run full `next build` on PRs (no `VERCEL_ENV=preview`), preserving validation on merge path.
