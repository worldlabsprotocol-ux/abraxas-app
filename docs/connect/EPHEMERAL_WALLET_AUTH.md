# Ephemeral wallet authentication (Phase A)

## Model

- **Wallet signature** proves control of a Solana address for a short time.
- **Challenges** are single-use, domain-bound, and stored in **Upstash Redis** (Production) with TTL.
- **Sessions** are HS256 JWTs in HttpOnly cookies plus an **active-session allowlist** in Redis for immediate revocation.
- **No** `abraxas_accounts` row is created on ordinary sign-in (`persistent_account_created: false`).

## Enable (Production — founder authorization)

- `ABRAXAS_EPHEMERAL_WALLET_AUTH=1`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `ABRAXAS_ACCOUNT_SESSION_SECRET` (32+ chars)
- `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` (or rely on production default)

Public nav reads `/api/auth/native/enabled` — when `auth_mode` is `ephemeral_wallet`, Sign in uses `/api/auth/wallet/solana/*`.

## Not in Phase A

- Full Launchpad sandbox on PostgreSQL without explicit durable activation
- Live verification (Build #745)
- Replacing institutional durable configuration stores

## Limitations (explicit)

- **Immediate revocation** requires the shared Redis allowlist; fully stateless JWTs alone cannot be revoked before expiry.
- **Ephemeral sandbox** (`POST /api/auth/wallet/sandbox/enter`) stores workspace metadata in Redis until expiry — not a personal account ledger.
