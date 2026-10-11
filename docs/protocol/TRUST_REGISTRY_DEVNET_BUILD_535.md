# Trust Registry Devnet Deployment & Live Proof (Build #535)

**Integration base:** `71ac9efa6efa92f652d54a99ea974aba23bfd2ed` (Build #534)

**Program ID:** `EN29YNgHRuJ3h9cWrPS9hSDBt8DUNtoSSTT9EbUZewC8`

**Artifact SHA-256:** `fc7780abd4f413505cb04fd0323fb958649311aa8d8ac8899e302fd3ded5b986`

## Operator authorization (required for live devnet)

Cloud agents and CI **must not** interpret the build prompt as spend/deploy authorization.

Set only after explicit operator approval:

```bash
export ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED=true
export SOLANA_DEPLOY_WALLET=/secure/path/payer.json
export SOLANA_UPGRADE_AUTHORITY=<pubkey>
export SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
export SOLANA_DEVNET_OBSERVE_RPC_URL=https://rpc.ankr.com/solana_devnet
```

Never commit keypair JSON files.

## Release integrity (Phase 1)

```bash
npm run integrity:trust-registry-535
```

Verifies ELF digest, program keypair **pubkey**, writes canonical IDL to `solana/abraxas-eligibility-gate/idl/abraxas_trust_registry.json`.

## Preflight (Phase 2 — dry run default)

```bash
npm run preflight:trust-registry-devnet-535
```

Checks devnet genesis hash, dual RPC, balances, artifact digest, authorization flags.

## Live deploy & lifecycle (Phase 3 — operator executed)

```bash
solana program deploy solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so \
  --url devnet \
  --keypair "$SOLANA_DEPLOY_WALLET" \
  --program-id solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry-keypair.json
```

Then initialize registry, register policy, add publisher/revoker, publish commitment, attempt unauthorized revoke (must fail), authorized revoke, and record transaction signatures.

Populate session JSON for independent verification:

```json
{
  "registry_domain_hex": "<32-byte hex>",
  "receipt_payload_hash": "<hex>",
  "policy_commitment_hash": "<hex>",
  "expected_status": "ACTIVE"
}
```

Save as `/secure/trust-registry-live-session.json` and:

```bash
export ABRAXAS_TRUST_REGISTRY_LIVE_SESSION_JSON=/secure/trust-registry-live-session.json
npm run verify:trust-registry-independent-535
```

## Evidence

```bash
npm run evidence:trust-registry-devnet-535
```

Output: `/opt/cursor/artifacts/trust-registry-devnet-evidence-v535.json`

## Mainnet

**Blocked** in this build — devnet proof only.
