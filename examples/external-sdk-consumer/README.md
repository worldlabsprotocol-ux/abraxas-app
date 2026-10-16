# External SDK consumer smoke (Build #587)

This directory holds the **clean-room smoke script** used by `scripts/build587/verify-external-install.mjs`.

It does **not** import Abraxas repository paths. It installs only `@abraxas/institutional-verification` from an `npm pack` tarball.

## Maintainer workflow

```bash
npm run test:institutional-sdk
```

## Synthetic fixtures

Loaded from `@abraxas/institutional-verification/fixtures/synthetic` — labeled non-production in package metadata.
