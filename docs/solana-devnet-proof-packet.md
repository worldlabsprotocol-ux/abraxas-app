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
a failed replay attempt. These observations are still outstanding until the
operator runs the live path below and retains its finalized signature.

For a human-operated devnet transaction, use the same fresh issued attestation
and public signer document. The local runner loads the fee payer keypair only
from `ABRAXAS_GATE_ADMIN_KEYPAIR_PATH`, checks the reviewed binaries and exact
config accounts, simulates, rechecks, sends once, confirms finalization, and
compares both resulting account byte layouts. It then simulates a replay using
the same attestation; this replay is **not broadcast**.

```bash
cd ~/abraxas-devnet
export ABRAXAS_GATE_ADMIN_KEYPAIR_PATH="$HOME/.config/solana/id.json"
npx tsx scripts/solana-devnet-proof-run-local.ts \
  /path/outside/repo/issued-attestation.json \
  /tmp/abraxas-solana-signer-public.json \
  --ownership-reviewed --confirm
```

Use only the devnet fee payer, never a Mainnet key or a signer private key.
If the send result is uncertain, inspect the authorization PDA and transaction
history before doing anything else. A fresh attestation is required for another
attempt. The runner reports `replay_simulation_denied`; it does not claim a
finalized failed replay transaction or an expiry observation.

If the sandbox partner has a current institutional receipt, a verified gate
deployment ref, and an `abx_test_` key with the `verify:requests` scope, the
operator can issue and run in one session. This avoids copying an expiring
attestation into a file manually. The key goes only in an Ubuntu environment
variable, never in the command line or repository. The command checks the
reviewed config before issuance, calls the authenticated partner API with the
fixed `activate_protocol_access` action, writes the signed message to a
private temporary file, runs the local proof, then removes the file.

```bash
cd ~/abraxas-devnet
export ABRAXAS_GATE_ADMIN_KEYPAIR_PATH="$HOME/.config/solana/id.json"
export ABRAXAS_SANDBOX_PARTNER_API_KEY='abx_test_...'
npx tsx scripts/solana-devnet-proof-issue-and-run-local.ts \
  '<current-institutional-receipt-id>' \
  '<verified-sandbox-deployment-ref>' \
  /tmp/abraxas-solana-signer-public.json \
  --ownership-reviewed --confirm
unset ABRAXAS_SANDBOX_PARTNER_API_KEY
```

The existing `ABRAXAS_GATE_PARTNER_ID`, `ABRAXAS_GATE_APPLICATION_ID`,
`ABRAXAS_GATE_ADMIN_PUBKEY`, and `ABRAXAS_GATE_SIGNER_KEY_ID` values remain
required by the chain postcheck. A key limited to `webhooks:read` cannot issue
this attestation. Issuance consumes a server nonce even if the subsequent
transaction fails; obtain a new receipt-bound attestation before retrying.

## Public transaction proof

After the local runner returns a finalized signature, anyone can check it without a keypair or partner session:

`GET https://demo.abraxasworld.xyz/api/solana/devnet/proof?signature=<finalized-signature>`

The endpoint reads Solana devnet at finalized commitment. It requires the reviewed institutional signer and bindings, the exact Ed25519 → Gate authorize → Protocol Access activate instruction sequence, a successful transaction, live authorization and entitlement accounts that match the signed message, and the current gate/consumer binaries and configuration accounts to match the reviewed release. The binary/configuration check describes the current deployment; it does not reconstruct historical program bytes at the transaction slot. The JSON reports the transaction slot, program IDs, account addresses, expiration, and whether access is currently valid. It does not return the subject or organization commitments. `currently_valid: false` after expiration does not erase the historical transaction. `replay_broadcast_proven: false` means this check does not establish that a second spend/replay was attempted. This devnet result is not production access or a mainnet deployment.
