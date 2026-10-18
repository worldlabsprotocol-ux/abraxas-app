# Ephemeral wallet authentication

See also: [Wallet-native trust protocol](./WALLET_NATIVE_TRUST_PROTOCOL.md).

## Model

- **Wallet signature** proves control of a Solana address for a short time.
- **Challenges** are single-use, domain-bound, and stored in **Upstash Redis** (Production) or **TCP Redis** (CI/self-hosted) with TTL.
- **Sessions** are HS256 JWTs (`iss`/`aud`/`env` bound) in HttpOnly cookies plus an **active-session allowlist** in Redis for immediate revocation.
- **No** `abraxas_accounts` row is created on ordinary sign-in (`persistent_account_created: false`).

## Retention (enforced TTLs)

| State | TTL | Location |
| --- | --- | --- |
| Auth challenges | 5 minutes | `lib/auth/ephemeralWallet/retention.ts` |
| Wallet sessions + allowlist | 4 hours | Redis + cookie `maxAge` |
| Sandbox workspace metadata | 24 hours | Redis |
| Sandbox test results | 24 hours | Redis |
| Rate limit counters | Native auth rate limiter TTL | Redis / memory |

Revocation entries remain until the issued session JWT expires.

## Routes

| Path | Purpose |
| --- | --- |
| `POST /api/auth/wallet/solana/challenge` | Issue sign-in challenge (not authenticated) |
| `POST /api/auth/wallet/solana/verify` | Verify Ed25519 signature, consume challenge, issue session |
| `GET/DELETE /api/auth/wallet/session` | Session status / logout |
| `GET /api/auth/wallet/enabled` | Ephemeral readiness |
| Aliases: `/api/auth/wallet/solana/session`, `/api/auth/wallet/solana/enabled` | Same handlers |
| `POST /api/auth/wallet/sandbox/enter` | Temporary workspace metadata |
| `GET /api/auth/wallet/sandbox/policies` | Sandbox-only test policies |
| `POST /api/auth/wallet/sandbox/test-verify` | Authorized sandbox test result (`ephemeral_sandbox_test_only`) |
| `GET /api/auth/wallet/sandbox/validate` | Independent signature/trust check |

Public nav reads `/api/auth/native/enabled` — when `auth_mode` is `ephemeral_wallet`, Sign in uses `/api/auth/wallet/solana/*`.

Temporary developer UI: `/developers/ephemeral-sandbox`.

## Enable (Production — founder authorization)

- `ABRAXAS_EPHEMERAL_WALLET_AUTH=1`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `ABRAXAS_ACCOUNT_SESSION_SECRET` (32+ chars)
- `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` (or production default)

Do **not** enable a misleading “available” state when Redis or signature verification is unhealthy.

## Business upgrade (explicit)

Wallet ownership alone does not grant institutional authority. Durable business integration remains a separate, explicitly authorized path (`/pricing` — not auto-upgraded from ephemeral sessions).

## Limitations (explicit)

- **Immediate revocation** requires shared Redis allowlist state.
- **Test sandbox** results are labeled `ephemeral_sandbox_test_only` and cannot authorize Production.
- Full Launchpad PostgreSQL persistence requires explicit durable activation (not ordinary sign-in).
