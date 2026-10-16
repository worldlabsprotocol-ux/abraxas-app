# Institutional verifier backend example (Build #586)

This example shows how a **third-party TypeScript backend** validates an Abraxas signed decision receipt using `@/lib/institutionalVerification` without calling Abraxas Supabase or trusting the Abraxas UI.

## Separation

| Layer | Your responsibility |
|-------|---------------------|
| Receipt verification | `verifySignedDecisionReceipt` with pinned `ABRAXAS_RECEIPT_VERIFICATION_REGISTRY` |
| Policy enforcement | Product logic after `authorize === true` |
| Issuer trust | Pin registry JSON or pin digest + fetch from your configured origin |
| Revocation freshness | Portable revocation trust env + checkpoint store (presentation path) |
| Replay protection | Durable consumption store in production (`enforce_single_use: true`) |

## Run (synthetic receipt from CI fixtures)

From repository root, after exporting a pinned registry from `build546TrustRegistryEnv()` in tests:

```bash
export RP_PARTNER_ID=institutional-rp-example
export RP_POLICY_ID=institutional-age-21-v1
export ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]'
npx tsx examples/institutional-verifier-backend/verify.ts path/to/signed-receipt.json
```

## Product UI

See [/developers/institutional-verification](https://abraxasworld.xyz/developers/institutional-verification) for contract version, trust digest, and rejection codes.

Not published to npm — founder authorization required before any public package release.
