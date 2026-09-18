# Circle Arc testnet settlement

Status: **implemented, not claimed as a live Circle integration** until operator setup completes the definition of done.

Abraxas is not a custodian of customer funds. Settlement uses a dedicated DEMO/testnet Circle developer-controlled wallet pair on `ARC-TESTNET`. The public wallet address is never eligibility or ownership proof. A signed, server-verified partner receipt is.

## Behavior

1. Verify the sandbox receipt (approved, signed, unexpired, matching partner/policy/version).
2. Insert a `pending` intent. An intent is not a payment.
3. If Circle credentials or schema are missing, stay pending and return a Preview-safe unavailable code.
4. If credentials exist, authenticate the DEMO wallets against `ARC-TESTNET` and submit a USDC transfer.
5. Mark `settled` only from a sealed Circle-authenticated result with `COMPLETE`. Client hashes, browser responses, callback parameters, and unsealed mock objects cannot settle.
6. Duplicate `(application, idempotency_key)` or `(application, receipt_id)` attempts are blocked.

Safe evidence fields: provider request reference, Circle transaction reference, network, currency, integer `amount_minor`, state, timestamp, receipt ID, policy ID/version, idempotency key.

Secrets, entity secrets, wallet-set secrets, private keys, raw provider payloads, and PII are not stored or shown in Launchpad, manifests, or reports.

## Operator

See `docs/CIRCLE_ARC_TESTNET_OPERATOR.md`. Credentials belong in Vercel Preview and Cloud Agent runtime only.
