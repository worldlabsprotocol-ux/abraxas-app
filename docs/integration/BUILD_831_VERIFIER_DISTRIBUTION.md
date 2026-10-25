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

## 4. External example

`examples/external-node-partner` depends on `file:../../artifacts/npm/abraxas-independent-verifier-0.1.1.tgz`.

## 5. Founder approval for npm

Before `npm publish`:

- Confirm `@abraxas` scope ownership on npm
- License / legal review (`UNLICENSED` today)
- Release signing and CI publish workflow

## 6. Remaining blockers to external invite

- Live sandbox credentials + callback allowlist (ops)
- Optional: attach tarball to GitHub Release for partners who do not clone the repo
