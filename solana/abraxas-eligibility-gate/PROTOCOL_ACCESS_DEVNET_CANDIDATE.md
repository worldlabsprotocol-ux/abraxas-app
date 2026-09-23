# Protocol-access Solana devnet candidate

The reference consumer is pinned to the operator-generated public program ID `3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j`. The private program keypair stays on the operator's Ubuntu machine. This candidate is not deployed or approved by adding the ID to source.

From the repository root in Ubuntu, with the pinned Rust 1.88.0, Solana CLI 2.2.20, and platform-tools v1.53:

```bash
cd solana/abraxas-eligibility-gate
PATH="$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH" \
  cargo-build-sbf --tools-version v1.53 --no-rustup-override \
  --manifest-path programs/abraxas-protocol-access/Cargo.toml
cd ../..
npx tsx scripts/solana-protocol-access-candidate-digest.ts
```

Compare the local byte length, keccak observation digest, and ELF SHA-256 against the independent GitHub CI candidate output for the same commit. A mismatch stops the handoff. The existing eligibility-gate release digest must continue to match its reviewed r2 artifact. The consumer also needs source review before a human devnet deploy. No keypair, RPC URL, or transaction is required for this build check.

Do not commit `target/`, `.so`, or any generated keypair. A matching candidate digest alone does not initialize GateConfig, prove an onchain observation, or register a deployment.

## Evidence and limitation

The operator build and [GitHub CI run 35817063788](https://github.com/worldlabsprotocol-ux/abraxas-app/actions/runs/35817063788) reproduced the exact candidate: 264184 bytes, keccak `0x42a94dc3ba45650177c8cb423f55ec1416ed6a883ce5421acf463b304aae06af`, SHA-256 `0xbf32d70fa01815fe8f9e60341fcf89d8d07d506bbbbe9241aa001089e22ddded`.

An activated entitlement is checked against its expiry onchain. The existing gate has no post-issue authorization revocation instruction, so a later offchain withdrawal does not immediately invalidate a previously activated onchain entitlement. Server-issued attestations default to 10 minutes and are capped at 15 minutes; the institutional result may shorten that window. This candidate must not be presented as instant onchain revocation. A separate reviewed gate upgrade would be required for that guarantee.
