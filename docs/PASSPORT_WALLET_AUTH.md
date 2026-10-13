# Passport wallet-native authentication

## Trust boundary audit (before this change)

| Stage | Previous behavior | Mandatory Google? |
|--------|-------------------|-------------------|
| Wallet Standard connect (`SuiWalletStandardConnect`) | Client-only `localStorage`; no server session | N/A (not authentication) |
| Passport / partner sign-in | `startGoogleZkLogin` → OAuth → `zklogin/register` → `POST /api/auth/browser-session` with `id_token` | **Yes** for new holder UI session |
| `resolveBrowserSession` | JWT + row in `sui_zklogin_identities` | Implicitly zkLogin/hosted rows only |
| Identity verification / receipts | Separate pipeline (`requireBrowserSession` + IDV) | Login gate was Google; IDV unchanged |
| Partner verify (`PartnerVerifyClient`) | Sign-in phase called Google only | **Yes** |

Wallet connection stopped at the browser; Google OAuth became mandatory at server session issuance.

## New holder path

1. `POST /api/auth/passport-wallet/challenge` — short-lived challenge + HttpOnly context cookie (`abx_passport_wallet_auth_ctx`).
2. Wallet signs personal message (`sui:signPersonalMessage`).
3. `POST /api/auth/passport-wallet/verify` — atomic consume, Sui signature verify, Passport identity resolve/create, HttpOnly browser session (`am: wallet`).

Google zkLogin remains under legacy recovery / optional buttons — not required for new wallet-first sign-in.

## Database migration (review before DEMO/Production apply)

`supabase/migrations/134_passport_wallet_auth_challenges.sql` — table + `consume_passport_wallet_auth_challenge` RPC.

## Security properties

- Challenge binds origin, wallet address, network, action, nonce, expiry, session context hash.
- Single-use consume (replay → 401).
- Wrong domain / wallet / network / signature rejected.
- Wallet login does **not** grant IDV claims or receipts.
- Existing Google/hosted identity at same address requires explicit legacy link (409 `legacy_link_required`), not automatic merge.
- Legacy link: signed-in OAuth/hosted browser session + `link_legacy_wallet` challenge + `POST /api/auth/passport-wallet/link-legacy` (writes `passport_wallet_login_grants`, does not delete legacy rows).

## Partner Flow

`PartnerVerifyShell` renders wallet sign-in first; hosted partner flow continues to use `requireBrowserSession` after wallet authentication.
