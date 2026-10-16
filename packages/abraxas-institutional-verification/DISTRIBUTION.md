# Distribution and compatibility — Build #587

## Package identity

| Field | Value |
|--------|--------|
| Name | `@abraxas/institutional-verification` |
| Contract | `INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION` (exported from package) |
| Trust digest | `RECEIPT_TRUST_DIGEST_VERSION = 2` |

## Version policy

- **Semver** starting at `0.1.0` while integration surface stabilizes.
- **Patch:** bug fixes, no API or rejection-code changes.
- **Minor:** additive exports/types; backward compatible pins.
- **Major:** breaking rejection codes, trust bootstrap requirements, or digest version bumps.

## Controlled delivery (Build #588)

Partner download requires **both**:

1. Deployment artifact channel: `INSTITUTIONAL_SDK_DISTRIBUTION_MODE=authorized`, versioned tarball on server, and **`INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256`** (founder-approved digest, independent of the on-disk file).
2. Partner entitlement: **`INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS`** JSON allowlist (partner_id, package_version, optional expires_at / application_ids). Optional revocations: **`INSTITUTIONAL_SDK_DISTRIBUTION_REVOKED_PARTNERS`**.

Download audit to `partner_launchpad_activity` is **mandatory** before bytes are served; audit failure returns 503 without serving the tarball.

## Release artifact requirements

Each release tarball must include:

- `dist/` compiled ESM + CJS + `.d.ts`
- `fixtures/synthetic/` (public keys + signed receipt JSON, labeled synthetic)
- `README.md`, `DISTRIBUTION.md`, `SECURITY.md`
- No private signing keys, Supabase credentials, or admin tooling

Build: `npm run build:institutional-sdk` from repository root.

Shipped artifacts **exclude source maps** (no embedded `sourcesContent` or repository paths). Maintainers may set `SDK_SOURCEMAP=1` locally for debug builds; those outputs must not be packed.

## Trust-contract compatibility

Integrators must pin **digest v2** (`digestReceiptVerificationKeyDocument`). v1 pins are invalid.

Portable revocation issuer trust env keys:

- `ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST`
- `ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS`

## Replay infrastructure

| Deployment | Minimum store |
|------------|----------------|
| Single Node process | `FileReceiptConsumptionStore` on **shared** POSIX filesystem with `O_EXCL` markers |
| Multiple app instances | **Shared atomic** backend (PostgreSQL advisory locks, Redis SETNX, etc.) implementing `ReceiptConsumptionStore` |
| CI / synthetic fixtures | In-memory only with explicit test flag inside Abraxas repo — **not** shipped for production use |

## Deprecation

Pre-release npm publication is **not** available. Repository importers using `@/lib/institutionalVerification` remain supported; migrate to the package when your release process includes the tarball.

## Security advisories

Report to Abraxas security contact via [security bounty](/security/bounty). Do not disclose production pin material in public issues.
