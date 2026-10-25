# @abraxas/independent-verifier

Standalone cryptographic verification for Abraxas signed receipts and issuer authority statements.

Designed for **third-party relying parties** — no Abraxas application backend, Supabase, or PostgREST required.

## Integrator workflow

1. Obtain and pin a `abraxas_trust_anchor_bundle` document out-of-band.
2. Verify `abraxas_issuer_authority_statement` signatures against the pinned anchor public key.
3. Verify receipt Ed25519 signatures against keys authorized in the statement.
4. For **current acceptability**, verify a signed `abraxas_signed_receipt_status_statement` from a status signer listed in the issuer authority statement (unsigned JSON is rejected).

## Install (external apps)

```bash
npm install ./abraxas-independent-verifier-0.1.1.tgz
```

Build tarball from source: `npm run build831:pack-verifier` (repo root). Verify checksum: `artifacts/npm/*.sha256`.

Registry publish is founder-gated — see [DISTRIBUTION.md](./DISTRIBUTION.md).

## Examples in Abraxas repo

`examples/integration-first-relying-party/`, `examples/external-node-partner/`, `examples/independent-sias-verifier/` (CLI).
