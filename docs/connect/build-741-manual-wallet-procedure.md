# Manual operator procedure — real Solana wallet sign-in

**Status:** Required before Production GO. **Not executed** in cloud agent VM (no browser wallet extension).

## Environment

- HTTPS staging or Vercel preview bound to PostgreSQL with migrations **144–147**
- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1`
- Phantom or Solflare on **devnet** (or approved network matching `NEXT_PUBLIC_SOLANA_NETWORK`)

## Steps

1. Open homepage → confirm header shows **Sign in** only (no Connect Wallet / Google / Passport).
2. Click **Sign in** → select wallet → approve connection if prompted.
3. Confirm **Sign in to Abraxas** modal → **Sign to continue** (message signature, not transaction).
4. After success, nav shows **Account** → open `/account/applications`.
5. **Server evidence:** `GET /api/auth/native/session` returns `authenticated: true`, `wallet_address`, `session_id`, `auth_method: solana_wallet`.
6. Click **Start building** → run sandbox enrollment if needed → Launchpad loads.
7. Click **Integrate with my business** → `/pricing` shows existing plans (no crypto checkout activation).
8. **Sign out** → `DELETE /api/auth/native/session` returns `{ revoked: true, scope: "current_session_only" }`.
9. **Replay test:** repeat `GET /api/auth/native/session` with saved JWT cookie → must return `authenticated: false`.
10. Sign in again with same wallet → same `account_id` in session JSON.

## Expected failures (negative checks)

| Action | Expected |
|--------|----------|
| Reject wallet signature | No session cookie; remain signed out |
| Replay old verify POST | HTTP 409 `replay` |
| Wrong network in wallet | Challenge/verify `wrong_network` |

Record: date, preview URL, wallet vendor, network, `account_id`, and session `session_id` in operator log.
