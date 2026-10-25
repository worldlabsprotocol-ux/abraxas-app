# Public API — stability contract

Version **0.1.x** exports from the package root (`@abraxas/independent-verifier`).

## Supported entry points

| Export | Purpose |
|--------|---------|
| `verifyAbraxasReceiptIndependently` | Full receipt + SIAS + signed status verification |
| `validateTrustAnchorBundle` | Pin validation before verify |
| `validateSignedIssuerAuthorityStatement` | SIAS structure + signature |
| `validateSignedReceiptStatusStatement` | Status evidence structure + signature |
| `verifyEd25519Detached` | Anchor rotation / custom Ed25519 checks |
| `canonicalizeJson` | Canonical JSON for hash/signature alignment |
| Types in `./types` | `DecisionReceiptRecord`, `TrustAnchorBundleV1`, `IndependentVerificationResult`, etc. |

## Runtime

- **Node:** >= 20
- **Dependencies:** `tweetnacl` only (bundled as dependency)
- **Not required:** Abraxas app, Supabase, PostgREST, `@/lib`

## Module formats

- ESM: `dist/index.js`
- CJS: `dist/index.cjs`
- Types: `dist/index.d.ts`

Breaking changes require a minor/major version bump and release notes.
