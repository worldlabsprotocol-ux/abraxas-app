# Institutional Solana devnet transaction packet

This offline packet bridges a server-issued institutional V2 attestation to the
reviewed gate and protocol-access consumer. It verifies the canonical message,
Ed25519 signature, current expiry, nonzero institutional commitments, and the
exact reviewed network, partner, policy, action, environment, signer, and PDA
bindings. It emits three instructions in order: Ed25519 verify, gate `authorize`,
consumer `activate_protocol_access` (which CPI-consumes the authorization).
It neither reads a keypair nor connects to RPC or broadcasts.

Use the authenticated partner API response from `POST /api/v1/chain-attestations`
with `solana_message` and `solana_signature`. The packet builder decodes the
signed message; `fields` are optional and, when supplied, must match it exactly.
Do not use the client-visible Launchpad projection, a synthetic
fixture, or a copied signature. Keep the response in a private local JSON file.
The public signer document can be downloaded from
`https://demo.abraxasworld.xyz/api/chain-attestations/verification-keys/solana`.

```bash
cd ~/abraxas-devnet
npx tsx scripts/solana-protocol-access-postcheck.ts /tmp/abraxas-solana-signer-public.json
npx tsx scripts/solana-devnet-proof-packet.ts \
  /path/outside/repo/issued-attestation.json \
  28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt \
  /tmp/abraxas-solana-signer-public.json
```

The postcheck and signer document must be fresh. The output is an **unsigned**
instruction packet, not evidence of an on-chain authorization. Before a human
submits it, recheck the devnet genesis, both deployed ELF digests, exact gate
and consumer config bytes, active signer, payer ownership, available rent, and
that the authorization PDA is vacant. The attestation expires quickly; generate
the packet immediately before the transaction. The transaction must keep the
Ed25519 instruction immediately before `authorize`. After submission, record
the finalized signature, authorization consumed state, entitlement state, and
a failed replay attempt. These observations are still outstanding.

