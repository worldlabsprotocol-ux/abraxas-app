# Build #853 — Native Wallet Authorization and Sovereign Protocol Execution

## Objective

Restore protocol-first execution: wallet-native authorization → evidence evaluation → signed decision → **independent** relying-party verification. PostgreSQL remains operational persistence; it is not the cryptographic trust root at verify time.

## Reused capabilities

| Layer | Existing module |
|-------|-----------------|
| Wallet envelope | `lib/auth/ephemeralWallet/protocolEnvelope.ts` |
| Scoped tenant/app/action | `lib/auth/walletAuthorization/scopedExecutionEnvelope.ts` |
| One-time challenges | `lib/auth/walletAuthorization/scopedChallengeLifecycle.ts` |
| Evidence permit gate | `lib/decisionReceipts/evidenceIntegrityContract.ts` |
| Sovereign current validity | `lib/persistence/boundary/sovereignCurrentValidity/evaluate.ts` |
| SIAS + signed status | `lib/persistence/boundary/issuerAuthority/*`, `trustDistribution/publishSignedReceiptStatus.ts` |
| Independent verifier | `packages/abraxas-independent-verifier` |

## New in #853

- **`lib/protocolExecution/walletSovereignTrustPath.ts`** — vertical slice orchestrator (wallet sign → challenge consume → evidence → portable verify).
- **`verifyThreeLayerPortableFixture`** — CI/adversarial path with **no Supabase/PostgREST** on the verification verdict (synthetic signed status for contract tests).
- **`runBuild853WalletSovereignExecution`** — disposable sovereign PG contract (application scope + independent verify).

## Trust boundaries

| Concern | Trust root |
|---------|------------|
| Signature authenticity | Receipt + status signer keys (pinned anchor bundle) |
| Issuer authority | Signed Issuer Authority Statement (SIAS) |
| Current acceptability | Signed status statement + freshness rules |
| Wallet authorization | Ed25519 over scoped envelope; one-time challenge |
| Evidence permit | `deriveEvidenceIntegrityVerdict` (fail closed) |

Operational PostgREST validity (`evaluateReceiptCurrentValidity`) remains for legacy app paths — **not** required for the portable verifier contract exercised here.

## CI

```bash
npx vitest run lib/protocolExecution/walletSovereignTrustPath.adversarial.test.ts \
  lib/auth/walletAuthorization/scopedExecutionEnvelope.test.ts

ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npm run sovereign:build-853-wallet-sovereign
```

## Explicit non-goals (#853)

- Demo / Production migrations
- Demo encrypted backup execution (operational gate only; does not block this build)
- Google OAuth or new IdP
- Homepage / unrelated UI
- v1.1.0 production issuance activation

## Remaining blockers (post-#853)

- Unify ephemeral Redis wallet challenges with sovereign PG consume RPC (native Solana account pattern exists).
- Wire scoped envelope into live partner-flow HTTP handlers (today: contract + sovereign CI).
- Cut operational partner APIs over to sovereign validity + exported signed status bundles by default.
