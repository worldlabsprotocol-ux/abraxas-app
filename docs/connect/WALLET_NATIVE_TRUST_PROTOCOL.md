# Abraxas wallet-native trust protocol (v1)

Abraxas is a verification protocol. Wallet interaction proves control for a **specific purpose**; it is not a permanent account login.

## Three states (never conflated)

| State | Meaning |
| --- | --- |
| **Wallet connected** | Browser wallet adapter has a public key available. No Abraxas authorization implied. |
| **Wallet authenticated** | User signed the **sign-in envelope** (`abraxas_wallet_sign_in_v1`). Abraxas issued a **short-lived capability** (`wallet:session`, `account:read` only). |
| **Action authorized** | User signed an **operation envelope** for one privileged action (e.g. `sandbox:enter`). Consumed independently of sign-in. |

Disconnecting the wallet stops future browser prompts; it does **not** revoke already-issued signed proofs until they expire (unless explicit allowlist revocation is enabled).

## Authorization envelope

Canonical fields (see `lib/auth/ephemeralWallet/protocolEnvelope.ts`):

- Protocol ID + version  
- Domain + audience  
- Wallet public key  
- Purpose (sign-in vs action)  
- Operation + resource (+ optional policy)  
- Chain ID, nonces, request ID, issued/expiry  
- Ed25519 signature via Solana wallet (`signMessage`)

Sign-in purpose **cannot** authorize transfers, production policy changes, or verification issuance.

## Standing capability (minimal)

- HS256 JWT in HttpOnly cookie, ~30 minutes  
- Scopes: `wallet:session`, `account:read` only  
- Default revocation: **jwt_expiry_only** (logout clears cookie; captured JWT valid until exp — documented)  
- Optional: `ABRAXAS_EPHEMERAL_REVOCATION=allowlist` + shared transient store for immediate logout invalidation  

## Transient state and distributed Production

**Local dev / isolated tests:** process-local Maps (consume-once within one Node process).

**Distributed Production (Vercel):** process Maps **cannot** enforce global single-use challenges. Protected wallet auth is **unavailable** until an authoritative replay store is configured (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `ABRAXAS_EPHEMERAL_REDIS_URL` for self-hosted TCP Redis). There is **no silent downgrade** to weaker replay guarantees.

Redis is an optional **minimal Abraxas-controlled transient store** for atomic GETDEL — not a personal account database.

See `TRANSIENT_STATE_AUDIT` in `lib/auth/ephemeralWallet/transientStatePolicy.ts`.

## Verification center

Applications ask policy-bound questions → holder authorizes minimum interaction → Abraxas validates trust material → signed result returned. Sandbox test results use label **`ephemeral_sandbox_test_only`**.

## Institutional vs temporary

- Temporary sandbox: no `abraxas_accounts` row.  
- Business integration: explicit durable activation; wallet alone does not represent an organization.
