# Build 878 — Why Demo wallet sandbox is disabled

This is **configuration policy**, not a product defect.

## Observed signals (`GET /api/auth/wallet/enabled`)

| Field | Demo (`demo.abraxasworld.xyz`) | Production (`abraxasworld.xyz`) |
| --- | --- | --- |
| `flag_enabled` | `false` | `true` |
| `config_code` | `disabled` | `null` |
| `operational` | `false` | `true` |
| `ephemeral_state` | `none` | `complete` |
| `state_backend` | `null` | `redis` |

## Root cause

Ephemeral Developer Workspace auth is gated by `ABRAXAS_EPHEMERAL_WALLET_AUTH` (see `lib/auth/ephemeralWallet/featureFlag.ts`). Demo deployments leave this **disabled** and do not provision ephemeral Redis state — `connect_mode: explore`.

Production enables the flag with Redis-backed challenge replay and session stores (`lib/auth/ephemeralWallet/operational.ts`).

## Correct testing posture

- **Do not** weaken wallet requirements because Demo is disabled.
- **Do** run unified workspace wallet steps on an **authorized wallet-operational host** (Production scoped non-destructively, or an isolated staging project with ephemeral auth + Redis configured like Production).
- **Do** run Launchpad partner transactions on **Demo** when `LAUNCHPAD_*` targets Demo (existing Build 873 / 864 runners).

Partner holder wallet signing on Demo uses **passport-solana** APIs and is separate from ephemeral sandbox workspace auth.
