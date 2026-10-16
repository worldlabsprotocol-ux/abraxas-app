# Institutional verifier backend example (Build #586)

Safe defaults for third-party TypeScript backends using `@/lib/institutionalVerification`.

## Separation

| Layer | Your responsibility |
|-------|---------------------|
| Trust bootstrap | Pin `ABRAXAS_RECEIPT_VERIFICATION_REGISTRY` **or** fetch with mandatory `ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST` |
| Cryptographic inspection | `inspectSignedDecisionReceipt` — never authorizes |
| Authorization | `verifySignedDecisionReceipt` + durable `FileReceiptConsumptionStore` + institution revocation feed |
| Policy enforcement | Your product logic after `authorize === true` |

## Modes

```bash
# Inspect only (no RP_CONSUMPTION_DIR required)
RP_VERIFY_MODE=inspect RP_PARTNER_ID=… RP_POLICY_ID=… \\
  ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]' \\
  npx tsx examples/institutional-verifier-backend/verify.ts signed-receipt.json

# Authorize (fail-closed without durable store + revocation feed)
RP_PARTNER_ID=… RP_POLICY_ID=… \\
  RP_CONSUMPTION_DIR=/var/lib/your-app/abraxas-replay \\
  RP_REVOCATION_FEED_JSON='{"available":true,"status":"active"}' \\
  ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]' \\
  npx tsx examples/institutional-verifier-backend/verify.ts signed-receipt.json
```

Network key bootstrap requires a pin:

```bash
ABRAXAS_TRUST_ORIGIN=https://abraxasworld.xyz \\
ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST=<operator-pinned-sha256> \\
```

Not published to npm — founder authorization required before any public package release.

Product UI: [/developers/institutional-verification](https://abraxasworld.xyz/developers/institutional-verification)
