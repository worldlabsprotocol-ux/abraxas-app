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

After a human signs and submits `initialize_config`, run the separate **read-only post-init observation** with the same vetted public signer document and four operator bindings:

```bash
npx tsx scripts/solana-gate-config-observe.ts /tmp/abraxas-solana-signer-public.json
```

It rechecks the devnet genesis and both program binaries, then compares the on-chain GateConfig owner, PDA, admin, partner program, network, partner/policy/action/environment hashes, institutional/subject flags, zero reusable commitments, bump, and the one active public signer against the vetted plan. Changed, absent, stale, or extra signer slots fail closed. Its output is an observation only: `registered: false`, `ownership_verified: false`, `broadcast: false`. Human review of Launchpad ownership and registry verification remain separate.

