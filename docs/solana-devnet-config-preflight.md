# Solana devnet GateConfig preflight

Both program binaries have been deployed and their onchain ELF dumps matched the reviewed release hashes. This preflight is the next step before any GateConfig initialization. It is read-only: it neither loads a keypair nor uses RPC, signs, sends, registers, or activates a gate.

The operator needs the real Launchpad partner ID and application ID, the intended GateConfig admin **public** key, and the active DEMO Solana attestation signer **key ID**. Do not provide or paste the signer private key, program keypair, fee-payer keypair, recovery phrase, or RPC credential.

On the operator Ubuntu machine, obtain the public signer document:

```bash
curl -fsS https://demo.abraxasworld.xyz/api/chain-attestations/verification-keys/solana -o /tmp/abraxas-solana-signer-public.json
```

Set these four local environment variables to real values: `ABRAXAS_GATE_PARTNER_ID`, `ABRAXAS_GATE_APPLICATION_ID`, `ABRAXAS_GATE_ADMIN_PUBKEY`, and `ABRAXAS_GATE_SIGNER_KEY_ID`. Then run:

```bash
npx tsx scripts/solana-gate-config-preflight.ts /tmp/abraxas-solana-signer-public.json
```

The script rejects missing/placeholder IDs, malformed admin keys, private material in the signer document, and any signer that is not active, in-window, sandbox, Ed25519, V2, and allowed for `solana_devnet`. It pins policy `sandbox_institutional_protocol_access` v1, action `activate_protocol_access`, scope `sandbox:protocol_access`, environment `sandbox`, reviewed gate and consumer IDs, subject binding, and reusable zero organization/actor/category commitments. It prints only public hashes, signer key ID/public verifier, and the derived GateConfig PDA.

A successful plan still reports `ownership_verified: false`, `onchain_config_observed: false`, and `broadcast: false`. The next operator step must independently confirm Launchpad ownership and the current onchain program hashes before an initialization transaction is prepared. If the public signer endpoint is unavailable or has no matching active key, stop; do not invent a signer or use a placeholder.

After that independent review, the same public signer document and four bindings can produce an **offline instruction packet**:

```bash
npx tsx scripts/solana-gate-config-initialize-packet.ts /tmp/abraxas-solana-signer-public.json
```

The packet contains the exact Anchor `initialize_config` instruction bytes (base64), three account metas, the expected config digest, and the public signer verifier. It uses the vetted preflight and rejects the same missing, placeholder, or unqualified inputs. It never reads a keypair, calls RPC, signs, or broadcasts. Its `ownership_verified: false` and `onchain_config_observed: false` are intentional: the packet is not authorization to submit a transaction. Before human signing, independently confirm Launchpad ownership, the devnet program/consumer ELF digests, an uninitialized GateConfig PDA, the active signer, and the packet's policy/action/partner hashes. Do not use a stale packet after any binding or signer change.

The deployed binaries and PDA can be checked **now**, independently of signer configuration, with a public admin key:

```bash
ABRAXAS_GATE_ADMIN_PUBKEY=28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt \
  npx tsx scripts/solana-devnet-chain-precheck.ts
```

The script uses the public Solana devnet RPC by default or the server/operator `ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL`. It verifies the devnet genesis hash before and after reads, the upgradeable loader and both ProgramData ELF keccak/SHA-256 digests against source-controlled release records, and that the admin-derived GateConfig PDA is still absent. It prints no RPC URL or account bytes, reads no keypair, and cannot sign or broadcast. A successful result is an RPC observation, not Launchpad ownership proof or authorization to initialize; repeat it immediately before any human-signed transaction. Any wrong cluster, unknown binary, unavailable RPC, or occupied PDA blocks the step.

After a human initializes GateConfig, use the **same current public signer document and bindings** to compare the full on-chain account against the intended V2 sandbox configuration:

```bash
npx tsx scripts/solana-gate-config-postcheck.ts /tmp/abraxas-solana-signer-public.json
```

The postcheck re-verifies both program binaries and the devnet genesis hash, then compares the account owner, PDA bump, admin, partner program, policy/action/network/environment hashes, subject and institutional flags, all-zero reusable organization/actor/category commitments, and the active signer key ID **and public verifier** byte for byte. A missing account or any changed byte fails closed. Its `registry_status: not_registered` is deliberate: passing does not register a deployment or permit attestation issuance. Human review must still confirm Launchpad ownership and run the existing verify/register path with a separate, exact registry manifest. No keypair, transaction, or secret is accepted by this script.

To produce that manifest from the same exact on-chain check, after a successful postcheck run:

```bash
npx tsx scripts/solana-gate-config-postcheck.ts /tmp/abraxas-solana-signer-public.json --manifest > /tmp/abraxas-solana-devnet-observation.json
```

On success the output file contains **only the allowlisted registry manifest**, ready as input to the existing `abraxas-gate verify` and `register` commands. Check the command exit code before using the file; a failure writes a typed error instead. The exporter never accepts a browser-chosen program, PDA, digest, policy, action, signer, network, or environment. It derives them from the pinned plan and the exact live account; missing or changed chain data produces no manifest. Re-check the signer document and Launchpad ownership immediately before registration. A manifest is not a deployment ref or issuance permission; registration must independently re-observe the chain and return `verified_sandbox`.

The protocol-access consumer has a **separate** config PDA. After GateConfig passes its exact postcheck, generate a read-only instruction packet:

```bash
npx tsx scripts/solana-gate-config-postcheck.ts /tmp/abraxas-solana-signer-public.json --consumer-packet
```

The packet derives `protocol_access_config` from the verified gate PDA and pins partner, policy, action, and environment hashes to that gate. It includes the Anchor instruction bytes and four public account metas. It checks that the protocol config PDA is vacant and rechecks the devnet genesis hash. It has no keypair, signing, registration, or send path. An occupied PDA, changed GateConfig, wrong cluster, or modified binary fails closed. A human-operated local consumer initializer and exact post-initialization check are still required before claiming the cross-program action works on devnet.

The server RPC verifier also binds the on-chain signer slot to the current server-owned verification-key registry. A matching key ID with a different Ed25519 public verifier is `signer_update_required`; an unavailable, out-of-scope, or revoked registry signer cannot verify a gate. Registration and issuance re-observe this binding, so a signer rotation requires the partner's GateConfig to be updated and verified before new attestations can issue.

## Local devnet initialization

After the public signer endpoint is healthy, Launchpad ownership has been reviewed, and the offline packet and chain precheck agree, a human operator can initialize the **devnet** GateConfig from an interactive Ubuntu terminal. Set the existing four public bindings plus `ABRAXAS_GATE_ADMIN_KEYPAIR_PATH` (absolute path to the local admin keypair, outside git, mode 0600) and optionally `ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL` (HTTPS devnet RPC). The admin keypair must match `ABRAXAS_GATE_ADMIN_PUBKEY`. Do not paste its bytes or recovery phrase into the app, logs, or chat.

```bash
npx tsx scripts/solana-gate-config-initialize-local.ts \
  /tmp/abraxas-solana-signer-public.json --ownership-reviewed --confirm
```

The command refuses CI, Vercel, tests, non-interactive shells, wrong clusters, changed program binaries, an occupied config PDA, a missing/unqualified signer, and a mismatched admin. It simulates the exact Anchor instruction, repeats the public chain precheck, then signs and sends **one** devnet transaction. It waits for finalized confirmation and runs the exact postcheck. The output contains only public PDA, config digest, and transaction signature. `registry_status: not_registered` still requires the separate server verify/register flow; this command does not activate policy or issue an attestation.

If `send_outcome_unknown` appears, do not retry blindly: inspect the PDA and transaction history first. If the transaction finalizes but the postcheck fails, stop registration, inspect the public signature, and use the documented on-chain signer revocation path if needed. No Mainnet or Production initialization is supported.

