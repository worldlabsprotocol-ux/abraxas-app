# External SDK consumer smoke (Build #587)

This directory holds the **clean-room smoke script** used by `scripts/build587/verify-external-install.mjs`.

It does **not** import Abraxas repository paths. It installs only `@abraxas/institutional-verification` from an `npm pack` tarball.

## Maintainer workflow

```bash
npm run test:institutional-sdk
```

## Synthetic fixtures

Loaded from `@abraxas/institutional-verification/fixtures/synthetic` — labeled non-production in package metadata.

## Failure paths exercised (Build #591)

`smoke.mjs` runs only against synthetic fixtures inside a clean npm project:

| Scenario | Expected result |
|----------|-----------------|
| Inspect-only with correct policy | Cryptographically authentic; `authorize === false` |
| Wrong relying-party policy | Verdict not `valid` (tenant/policy binding) |
| Authorize then replay same receipt | Second call denied (replay guard) |

These checks do not weaken cryptography — they assert fail-closed behavior for policy mismatch and replay.

## Security rejection matrix (Build #591)

`security-rejections.mjs` runs in the same clean-room install as `smoke.mjs`:

```bash
node scripts/build587/verify-external-install.mjs
```

Covers (synthetic fixtures only): wrong policy, wrong partner, untrusted issuer, invalid digest pin, malformed receipt, expired receipt, revoked feed status, revocation unavailable for authorize, non-contract revocation hints (must not authorize), duplicate consumption replay.

**Coverage gap:** authenticated stale **portable revocation snapshots** (`portable_revocation_snapshot` + checkpoint freshness) are not included in the synthetic tarball. Those rejections are exercised in-repo by `lib/institutionalVerification/build586.adversarial.test.ts`. A lightweight `{ status: "stale" }` object is **not** part of the SDK `RevocationSourceState` contract and does not prove authenticated revocation freshness.
