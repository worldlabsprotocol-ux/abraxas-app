# @abraxas/independent-verifier

Standalone cryptographic verification for Abraxas signed receipts and issuer authority statements.

Designed for **third-party relying parties** — no Abraxas application backend, Supabase, or PostgREST required.

## Integrator workflow

1. Obtain and pin a `abraxas_trust_anchor_bundle` document out-of-band.
2. Verify `abraxas_issuer_authority_statement` signatures against the pinned anchor public key.
3. Verify receipt Ed25519 signatures against keys authorized in the statement.
4. For **current acceptability**, supply fresh `abraxas_receipt_status_evidence` from your institution-operated adapter.

See `examples/independent-sias-verifier/` in the Abraxas repository.
