# Circle Arc testnet settlement

Status: **implemented, not claimed as a live Circle integration** until operator setup completes the definition of done.

Abraxas is not a custodian of customer funds. Settlement uses a dedicated DEMO/testnet Circle developer-controlled wallet pair on `ARC-TESTNET`. The public wallet address is never eligibility or ownership proof. A signed, server-verified partner receipt is.

## Behavior

1. Verify the sandbox receipt (approved, signed, unexpired, matching partner/policy/version).
2. Insert a `pending` intent with a **server-generated UUID v4** Circle idempotency key. Partner and UI values are ignored. An intent is not a payment.
3. If Circle credentials, schema, or the DEMO/Preview testnet allowlist are missing, stay pending and return a Preview-safe unavailable code.
4. If credentials exist on an approved DEMO/Preview testnet environment, authenticate the DEMO wallets against `ARC-TESTNET` (`GET /v1/w3s/wallets/{id}`) and submit a USDC transfer.
5. Mark `settled` only from a sealed Circle-authenticated result with official `COMPLETE`. `FAILED`/`DENIED` map to `failed`. `CANCELLED` maps to `cancelled`. Other official states stay `submitted` (retrying). Client hashes, browser responses, callback parameters, and unsealed mock objects cannot settle.
6. Duplicate `(application, receipt_id)` retries reuse the persisted Circle key. The key is globally unique for the Circle API key.

Safe evidence fields: provider request reference, Circle transaction reference, network, currency, integer `amount_minor`, state, timestamp, receipt ID, policy ID/version, server idempotency key.

Secrets, entity secrets, wallet-set secrets, private keys, raw provider payloads, credential-presence booleans, and PII are not stored or shown in Launchpad, manifests, or reports.

## Operator

See `docs/CIRCLE_ARC_TESTNET_OPERATOR.md`. Credentials belong in Vercel Preview and Cloud Agent runtime only. Production, staging, and local stay blocked unless explicitly allowlisted for DEMO testnet.
