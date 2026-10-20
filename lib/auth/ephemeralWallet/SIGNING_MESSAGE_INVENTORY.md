# Abraxas wallet signing message inventory

Abraxas-controlled `signMessage` payloads (not Solana transactions).

| Flow | Generator | Verifier | Purpose constant |
|------|-----------|----------|-------------------|
| Ephemeral wallet sign-in | `buildEphemeralWalletSignInMessage` → `protocolEnvelope` | `verifyEphemeralWalletAuth` (stored message + Ed25519) | `abraxas_wallet_sign_in_v1` |
| Sandbox workspace enter | `issueWalletActionChallenge` | `verifyWalletActionChallenge` | `abraxas_action_sandbox_enter_v1` |
| Sandbox test verification | `issueWalletActionChallenge` | `verifyWalletActionChallenge` | `abraxas_action_sandbox_test_verify_v1` |
| Native Abraxas account (Solana) | `buildAccountSolanaSignInMessage` | Native account solana auth service | SIWS-style (unchanged in this pass) |
| Passport Solana sign-in | `buildPassportSolanaAuthMessage` | Passport solana auth | Passport contract |
| Passport wallet (EVM) | `buildPassportWalletAuthMessage` | Passport wallet auth | Passport contract |
| Holder possession (sandbox age demo) | `holderPossessionChallenge` JSON | Passport possession verify | Separate Ed25519 payload (not wallet adapter) |

Security binding for ephemeral envelope: domain/host, origin, URI, audience, nonce, issued/expires, request ID, purpose, operation, resource, policy ID, chain ID, protocol ID/version. Verification compares signature to the **exact server-stored message** (rollout-safe for in-flight challenges).

**Copy rules**

- **Wallet sign-in (message-only):** three concise funds/spending/transaction reassurances.
- **Scoped authorization (sandbox verify, enter, future presentation):** lead with *what you approve*, *recipient*, and *authorization consequence*; then a single **financial safety (this message)** line (no SOL/spending approval). Scoped signatures are **not** consequence-free—only non-financial for this message type.
- **On-chain transactions:** never use sign-in or scoped message disclaimers.

UI review cards must render from **server-issued `display` payloads** tied to the stored challenge message.
