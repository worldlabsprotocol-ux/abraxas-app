# Build #831 — Independent verifier distribution

**Baseline:** #830 merged @ `e65b3f1e`

## 1. Distribution gap

`@abraxas/independent-verifier` was `"private": true` and consumed via `file:../../packages/...`, forcing monorepo path dependency.

## 2. Mechanism

**Versioned npm pack tarball** + SHA-256 checksum in `artifacts/npm/`.

- Reproducible: `npm run build831:pack-verifier`
- External proof: `scripts/build831/prove-external-install.sh` (install from `.tgz` only in `/tmp`)
- **npm registry:** prepared, **not published** — requires founder org authorization

## 3. Package

- Version **0.1.1**
- Runtime deps: `tweetnacl` only
- Public API: [PUBLIC_API.md](../../packages/abraxas-independent-verifier/PUBLIC_API.md)
- Install: [DISTRIBUTION.md](../../packages/abraxas-independent-verifier/DISTRIBUTION.md)

## 4. External example (self-contained)

`examples/external-node-partner` depends on `file:./vendor/abraxas-independent-verifier-0.1.1.tgz`. Partners copy the example folder (including `vendor/`) or download the tarball from a versioned GitHub Release — no monorepo layout required.

## 5. Self-contained proof

`examples/external-node-partner/vendor/` holds the tarball; dependency is `file:./vendor/...` — copy the example folder alone.

Proof: `scripts/build831/prove-self-contained-example.sh`

## 6. GitHub Release (founder-gated)

Procedure: [VERIFIER_GITHUB_RELEASE.md](../operations/VERIFIER_GITHUB_RELEASE.md)

**Not published by automation** until license and release permissions are approved.

## 7. Founder decisions before first invite

| Decision | Status |
|----------|--------|
| Distribution license (`UNLICENSED` → approved terms) | **Pending** |
| GitHub Release `independent-verifier-v0.1.1` | **Prepared, not published** |
| npm `@abraxas` publish | **Disabled** |
| Demo sandbox credentials + anchor OOB | **Pending** |

## 8. Remaining blockers to external invite

- Legal approval for tarball redistribution
- Published GitHub Release URL (or secure tarball handoff)
- Live sandbox credentials + callback allowlist (ops)
