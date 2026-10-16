# Institutional verifier backend example (Build #586)

Safe defaults for third-party TypeScript backends using `@/lib/institutionalVerification`.

## Separation

| Layer | Your responsibility |
|-------|---------------------|
| Trust bootstrap | Pin `ABRAXAS_RECEIPT_VERIFICATION_REGISTRY` **or** fetch with mandatory `ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST` (digest **v2** binds key lifecycle metadata) |
| Cryptographic inspection | `inspectSignedDecisionReceipt` — never authorizes |
| Authorization | `verifySignedDecisionReceipt` + durable `FileReceiptConsumptionStore` + **institution-operated** revocation adapter |
| Policy enforcement | Your product logic after `authorize === true` |

## Modes

```bash
# Inspect only (no RP_CONSUMPTION_DIR required)
RP_VERIFY_MODE=inspect RP_PARTNER_ID=… RP_POLICY_ID=… \
  ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]' \
  npx tsx examples/institutional-verifier-backend/verify.ts signed-receipt.json

# Authorize (fail-closed without durable store + trusted revocation adapter)
RP_PARTNER_ID=… RP_POLICY_ID=… \
  RP_CONSUMPTION_DIR=/var/lib/your-app/abraxas-replay \
  RP_REVOCATION_ADAPTER=institution_operated \
  RP_REVOCATION_FEED_MAX_AGE_SECONDS=300 \
  RP_REVOCATION_FEED_OBSERVED_AT='2026-06-15T12:00:00.000Z' \
  RP_REVOCATION_FEED_JSON='{"available":true,"status":"active","observed_at":"2026-06-15T12:00:00.000Z"}' \
  ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]' \
  npx tsx examples/institutional-verifier-backend/verify.ts signed-receipt.json
```

**Revocation:** Pasting arbitrary JSON into `RP_REVOCATION_FEED_JSON` is **not** authenticated issuer evidence. Your backend must use a trusted institution-operated adapter (your cron, SIEM, or signed feed verifier) that sets `observed_at` when the feed was last validated and enforces `RP_REVOCATION_FEED_MAX_AGE_SECONDS`. Without those guarantees the example fails closed.

Network key bootstrap requires a pin:

```bash
ABRAXAS_TRUST_ORIGIN=https://abraxasworld.xyz \
ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST=<operator-pinned-sha256-digest-v2> \
```

Not published to npm — founder authorization required before any public package release.

Product UI: [/developers/institutional-verification](https://abraxasworld.xyz/developers/institutional-verification)
