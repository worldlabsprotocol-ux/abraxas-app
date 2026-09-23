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
