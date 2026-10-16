# Build #590 — Production build reliability and release integrity

## Problem (Build #589 baseline)

On Vercel **8 GB** builders, `next build` with in-process ESLint + TypeScript peaked ~**7.9 GiB** aggregate Node RSS (webpack ~**6.4 GiB**, then parallel lint/type). GitHub Actions completes on larger runners with swap headroom.

## Durable model (Build #590)

| Stage | Where | Command | Validates TS/ESLint? |
|-------|--------|---------|----------------------|
| TypeScript (explicit) | GitHub Actions `typescript-validation` | `npm run validate:typescript` (`tsconfig.validation.json`) | **Yes (blocking)** |
| ESLint + Next integration | GitHub Actions `eslint-validation` | `npm run build` (in-process Next lint/type) | **Yes (blocking)** |
| Compile + SSG + traces | GHA `build` job + Vercel | `npm run build:compile` | **No** — requires green validation jobs on the same commit |
| Local full check | Developer machine | `npm run validate:typescript && npm run validate:eslint && npm run build` | Yes (in-build + explicit) |

`ABRAXAS_SKIP_IN_BUILD_VALIDATION=1` tells Next.js to skip **in-build** lint/type only. This is **not** a substitute for validation: merge candidates must pass the dedicated CI jobs.

## Vercel (preview and production)

`vercel.json` uses `npm run build:vercel` (same as `build:compile`). **No production env var changes.** Production deploys rely on CI validation on the merged commit before Vercel builds the artifact.

## Concurrency tuning

`next.config.js`: `experimental.cpus: 2`, `workerThreads: false` — lowers peak worker memory during SSG/type workers without disabling checks in CI.

## Measurements

Run:

```bash
export NEXT_PUBLIC_SUPABASE_URL=... # CI placeholders
node scripts/diagnostics/measure-next-build-memory.mjs --label full -- npm run build
node scripts/diagnostics/measure-next-build-memory.mjs --label compile -- npm run build:compile
```

Artifacts: `/opt/cursor/artifacts/build590-memory-*.json`
