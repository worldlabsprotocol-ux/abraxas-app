# Independent verifier — GitHub Release (founder-gated)

**Package:** `@abraxas/independent-verifier@0.1.1`  
**License:** `UNLICENSED` — do **not** attach public release assets until distribution terms are approved in writing.

## Pre-release checklist

1. `main` includes merged Build #831.
2. `npm run test:build-831-verifier-distribution`
3. `bash scripts/build831/inspect-tarball.sh`
4. Legal/founder approves redistribution terms (replace or clarify `UNLICENSED`).
5. GitHub release permissions confirmed for the org/repo.

## Artifacts to attach (immutable)

| Asset | Source |
|-------|--------|
| `abraxas-independent-verifier-0.1.1.tgz` | `artifacts/npm/` |
| `abraxas-independent-verifier-0.1.1.tgz.sha256` | same directory |

Tag suggestion: `independent-verifier-v0.1.1`

## Partner install (after release is published)

```bash
curl -LO https://github.com/worldlabsprotocol-ux/abraxas-app/releases/download/independent-verifier-v0.1.1/abraxas-independent-verifier-0.1.1.tgz
curl -LO https://github.com/worldlabsprotocol-ux/abraxas-app/releases/download/independent-verifier-v0.1.1/abraxas-independent-verifier-0.1.1.tgz.sha256
shasum -a 256 -c abraxas-independent-verifier-0.1.1.tgz.sha256
npm install ./abraxas-independent-verifier-0.1.1.tgz
```

Downloading the tarball establishes **software provenance only** — trust anchors remain a separate out-of-band step ([TRUST_ANCHOR.md](../integration/design-partner/TRUST_ANCHOR.md)).

## npm registry

Remain **`private: true`** until `@abraxas` npm org ownership and publish provenance are approved.

## Create release (founder / authorized maintainer)

```bash
npm run build831:pack-verifier
bash scripts/build831/inspect-tarball.sh
gh release create independent-verifier-v0.1.1 \
  artifacts/npm/abraxas-independent-verifier-0.1.1.tgz \
  artifacts/npm/abraxas-independent-verifier-0.1.1.tgz.sha256 \
  --title "Independent verifier v0.1.1" \
  --notes-file docs/integration/BUILD_831_VERIFIER_DISTRIBUTION.md
```

Do not run `gh release create` from automation without explicit founder approval.
