# Credential & Partner API — security review preparation (Build #522)

**Status:** Internal preparation artifact. **Not** an independent third-party audit.

## Trust boundaries

| Boundary | Inside | Outside |
|----------|--------|---------|
| Holder PII / IDV artifacts | Abraxas Passport, Veriff pipeline, encrypted stores | Partner APIs, callbacks, narrow results |
| Signing keys | Server env / HSM target | Browser, partners, logs |
| Partner backend | API key, webhook HMAC secret | Holder browser session cookies |
| Chain observation | Operator RPC + registry | Product UI |

## Threat model (bounded)

1. **Receipt forgery** — attacker presents tampered receipt JSON.
2. **Replay** — reuse of consent, action nonce, or institutional consume nonce.
3. **Scope escalation** — wrong partner/policy/version/action scope.
4. **Stale trust** — valid signature on expired/revoked/superseded receipt.
5. **Webhook spoofing** — unsigned or wrong-secret delivery events.
6. **Partner key compromise** — scoped abuse of verification APIs.

## Attack surface inventory

- `POST /api/v1/institutional/eligibility/consume`
- `GET /api/v1/decision-receipts/{receiptId}/status`
- `GET /api/receipts/{receiptId}/public`
- Partner Flow browser session + `POST /api/v1/partner-flow/*`
- Webhook outbox delivery + HMAC verification
- Chain attestation issue (network-gated; mainnet blocked)

## Controls (implemented)

- Ed25519 decision receipt signatures; fail-closed trust evaluation (`evaluateDecisionReceiptTrust`).
- Partner API keys with scoped capabilities (`verify:requests`, etc.).
- Rate limiting on partner flow routes (`enforcePartnerFlowRateLimit`).
- Institutional security telemetry via `audit_events` (no PII fields).
- Durable institutional consume nonces via Postgres RPC (`institutional_eligibility_consume_nonce`) — scoped HMAC key derivation, mandatory `replay_nonce`, **permit-path-only** reservation (Build #524), fail-closed when store unavailable (migrations `139` + `140` hardening revokes direct INSERT; operator apply on DEMO before production).
- Simulated fake-backend concurrency tests are not substitutes for disposable Postgres integration (`replayRpcPostgres.integration.test.ts`).
- Webhook HMAC (`verifyWebhookSignature`).
- Solana mainnet promotion gate — product disables mainnet issuance until review.

## Test evidence

- `lib/institutional/consumeInstitutionalEligibility.test.ts` — permit/deny/refresh/replay.
- `lib/decisionReceipts/trustEvaluation` + `validityResolver` tests.
- `lib/partner/narrowPartnerResult/*Trust*.test.ts`
- `lib/institutional/externalRpVerificationHarness.test.ts` — webhook + replay.
- `lib/institutional/solanaMainnetPromotionGate.test.ts`

## Sensitive data handling

- Narrow partner results forbid claim payloads, DOB, document references (`NARROW_PARTNER_RESULT_FORBIDDEN_KEYS`).
- Security telemetry allowlist — no tokens, emails, or biometrics in metadata.
- Public receipt endpoint excludes PII by schema.

## Residual risks

- Full-repo `tsc --noEmit` includes pre-existing test typing debt (~150+ errors).
- Institutional replay guard is in-process; multi-region production requires durable nonce store (portable action / venue nonce tables).
- Independent on-chain observation not automated in CI without RPC secrets.
- Sui Passport mainnet audit/deploy milestones remain open (`lib/mainnetReadiness.ts`).

## Third-party audit requirements

1. Credential issuance and verification API review (scope: `/api/credentials/*`, receipt signing).
2. Partner authentication and authorization (API keys, scopes, tenant isolation).
3. Solana Anchor programs + upgrade authority governance (devnet artifacts as reference only).
4. Webhook delivery and replay resistance under load.
