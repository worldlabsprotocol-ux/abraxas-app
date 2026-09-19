# Circle Arc testnet settlement

Status: **implemented, not claimed as a live Circle integration** until operator setup completes the definition of done.

Abraxas is not a custodian of customer funds. Settlement uses a dedicated DEMO/testnet Circle developer-controlled wallet pair on `ARC-TESTNET`. The public wallet address is never eligibility or ownership proof. A signed, server-verified partner receipt is.

## Behavior

1. Verify the sandbox receipt (approved, signed, unexpired, matching partner/policy/version). Account login, self-attestation, and empty claim sets are inadequate. Circle never introduces an ID requirement; it only consumes an already-qualified receipt. For Preview demonstrations, prefer the sandbox-only `sandbox_economic_demo` pack. It is not age verification and is not usable in Production.
2. Insert a `pending` intent with a **server-generated UUID v4** Circle idempotency key. Partner and UI values are ignored. An intent is not a payment. This step never calls Circle or moves USDC. Create-intent accepts only a short-lived encrypted selection token. Replay is enforced in the database: a hashed selection `jti` is unique, and `(application_id, receipt_id)` is unique, so concurrent serverless creates cannot insert a second pending row. Same-token replay returns the existing row with `settlement_selection_replay`. Missing the hashed-jti column fails closed as `settlement_schema_unavailable`.
3. Review the pending intent. Duplicate create requests return the same row.
4. An explicit submit (`intent_id` + `confirm_testnet_transfer: true`) is required before Circle is contacted. Amount, wallets, network, currency, receipt, and partner stay server-derived.
5. If Circle credentials, schema, or the DEMO/Preview testnet allowlist are missing, submit stays blocked. Create can still leave a pending review row.
6. On submit, authenticate the DEMO wallets against `ARC-TESTNET` (`GET /v1/w3s/wallets/{id}`) and submit a USDC transfer once.
7. Mark `settled` only from a sealed Circle-authenticated result with official `COMPLETE`. `FAILED`/`DENIED` map to `failed`. `CANCELLED` maps to `cancelled`. Other official states stay `submitted` (retrying). Client hashes, browser responses, callback parameters, and unsealed mock objects cannot settle.
8. Duplicate `(application, receipt_id)` creates reuse the persisted Circle key. Duplicate submits do not call Circle again.

Safe evidence fields: intent ID, provider request reference, Circle transaction reference, network, currency, integer `amount_minor`, state, timestamp, receipt ID, policy ID/version, server idempotency key.

Secrets, entity secrets, wallet-set secrets, private keys, raw provider payloads, credential-presence booleans, and PII are not stored or shown in Launchpad, manifests, or reports.

## Operator

See `docs/CIRCLE_ARC_TESTNET_OPERATOR.md`. Credentials belong in Vercel Preview and Cloud Agent runtime only. Production, staging, and local stay blocked unless explicitly allowlisted for DEMO testnet.
