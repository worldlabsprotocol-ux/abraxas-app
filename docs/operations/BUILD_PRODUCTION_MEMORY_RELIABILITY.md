# Production build memory reliability (Vercel 8 GB)

## Incident (2026-10-28)

| Field | Value |
| --- | --- |
| Failing production deployment | `dpl_FrVevasVbrgz7sYnag79ND2nPRo7` |
| Failing commit | `77fbea19` (merge PR #893) |
| Last successful production | `576af5f6` (merge PR #892) |
| Error | `BUILD_UTILS_SPAWN_SIGKILL` / Vercel `out_of_memory` during `npm run build:vercel` |
| Build phase (founder-visible) | `Creating an optimized production build ...` |

**Important:** Preview deployment `dpl_Hz5Erf7xbbKUVwSn3UFKxAg9ZTQy` on the **same SHA** `77fbea19` reached **READY**. Production failure is therefore **not** explained by homepage founder-journey diff alone (+643 lines / 19 files). Treat as **near-limit memory pressure** with environment/cache variance until repeated production greens.

## Build memory ≠ runtime memory

Next.js peak RSS during `next build` reflects webpack graph compilation, optional type/lint workers, static generation, and trace collection — not steady-state request handling. Abraxas runtime can be healthy while compile intermittently exceeds 8 GB.

## Established contributors (measured historically)

From `scripts/diagnostics/build589-vercel-memory.md` (Build #589, same repo):

| Phase | Peak Node RSS (approx.) | Notes |
| --- | --- | --- |
| Full `next build` (lint + types enabled) | **~7.9 GiB** | Parallel ESLint + TS after webpack |
| `next build --no-lint` + skip types | **~7.3 GiB** | Types still ran without skip env |
| `build:vercel` (`ABRAXAS_SKIP_IN_BUILD_VALIDATION=1`) | **~5.5 GiB** | Production path today |
| Webpack-only (before lint line) | **~6.4 GiB** | Still tight on 8 GB with OS/install overhead |

Current production command (`vercel.json`):

```json
"buildCommand": "npm run build:vercel"
```

which maps to `ABRAXAS_SKIP_IN_BUILD_VALIDATION=1 next build --no-lint`.

## Compile scope snapshot

Run:

```bash
node scripts/diagnostics/analyze-production-build-scope.mjs
node scripts/diagnostics/measure-next-build-memory.mjs --label vercel -- env VERCEL=1 npm run build:vercel
```

Typical counts (main @ 77fbea19): **~241** App Router pages, **~487** API routes, **~50** direct production dependencies.

## Module classification (dependency-boundary principle)

| Class | Examples | Build impact |
| --- | --- | --- |
| **Trust core** | Receipt validation, policy binding, mandate, portable RP contracts | Server bundles; must stay |
| **Required product** | Homepage builder, Integration Studio embed, Launchpad, wallet auth | Large client graph (Solana adapters); optimize imports, not remove |
| **Operational** | Cron routes, webhook health, security monitoring | Compiled routes; moderate |
| **Legacy / redundant** | Unused meta-packages, duplicate onboarding **routes** still compiled | Remove only with reachability proof |
| **Optional / server-only** | `onnxruntime-node` (IDV capture), Move/Sui tooling scripts | ONNX externalized; not a client import |

### ONNX

- **Installed:** `onnxruntime-node` (CUDA skipped on Vercel install; `scripts/prune-ml-binaries.js`).
- **Runtime use:** `lib/idv/biometric/faceEmbeddingOnnx.ts` (server API for document capture).
- **Not** imported from client components; listed in `serverComponentsExternalPackages` and webpack server externals.
- **Do not remove** without replacing IDV capture assurance path.

### Removed in this correction (proven unused)

- **`@solana/wallet-adapter-wallets`**: listed in `package.json` but **zero** TS/TSX imports. Phantom + Solflare adapters are imported directly in `WalletContextProvider`.

### Restored direct dependency (Build 894 CI follow-up)

- **`zod`**: `app/api/bags/tokenize/route.ts` and `lib/services/bagsService.ts` import `zod` directly. It was never declared in `package.json`; CI sometimes resolved it transitively via removed wallet/Reown packages. **BAG routes remain supported** (Vercel cron `/api/cron/bags-sync`, tokenomics/revenue UI). Added explicit `zod` dependency — not a memory regression.

## Next.js configuration (8 GB benchmark)

When `VERCEL=1`, `next.config.js` now:

- Sets webpack `parallelism: 1`
- Disables `parallelServerCompiles` and `parallelServerBuildTraces`
- Sets `staticGenerationMaxConcurrency: 1`
- Sets `webpackBuildWorker: false` explicitly
- Enables `optimizePackageImports` for heavy UI/chart packages
- Keeps `cpus: 1`, `workerThreads: false`
- Disables production browser source maps

**Quality gates unchanged:** GitHub CI still runs TypeScript, ESLint, contract guards, and security regressions; Vercel build skips duplicate in-build validation only.

## Dependency security (separate from OOM)

`npm audit` reports many advisories (including critical). This build correction **does not** run `npm audit fix --force`. Track direct production exposure in `lib/security/directDependencyAudit.test.ts` and remediate with SemVer-safe bumps only.

## Trust architecture (founder directive)

- **Trust core:** evidence, proof, authority, continuity — portable verification, not hosted-app authority.
- **Blockchain adapters:** chain-specific enforcement where policy requires it.
- **Product / ops:** discovery, Launchpad, monitoring — consume trust core, do not become authority source.

Build optimization must not weaken cryptographic verification, tenant isolation, or mandate enforcement.

## Acceptance

- [ ] Two consecutive **production** Vercel builds green on `main` with peak memory headroom (build system report)
- [ ] Preview + production parity on same commit
- [ ] No regression in CI validation, execution-contract guard, or institutional security tests

## Related

- `scripts/diagnostics/build589-vercel-memory.md`
- `scripts/diagnostics/measure-next-build-memory.mjs`
- `scripts/diagnostics/analyze-production-build-scope.mjs`
