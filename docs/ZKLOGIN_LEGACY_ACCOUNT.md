# zkLogin legacy account sign-in

Existing Abraxas users who registered under a prior Google OAuth client cannot sign in after the OAuth client ID changes, because zkLogin address derivation includes JWT `aud` (audience). This document describes the **explicit legacy recovery path** — not a rollback of audience validation.

## Root cause of production "Invalid id_token" on legacy recovery

The legacy path launches Google OAuth with `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID`, but server JWT verification only trusts audiences listed in **`GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`** (server-only). When that variable was missing or misaligned in Vercel Production, users completed Google OAuth successfully but `POST /api/auth/zklogin/register` rejected the token.

**This is an operator configuration issue, not a code-path bug.** The fix is to set the server allowlist in Production and redeploy — not to infer server trust from browser-public env vars.

## Trust boundary (fail-closed)

| Layer | Variable | Role |
|-------|----------|------|
| Browser OAuth redirect | `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Canonical sign-in only |
| Browser OAuth redirect | `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID` | Legacy recovery sign-in only |
| **Server JWT verification** | `GOOGLE_ZKLOGIN_CLIENT_ID` | **Only** canonical `aud` trust |
| **Server JWT verification** | `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` | **Only** legacy `aud` trust |

`NEXT_PUBLIC_*` values are **never** used to define server JWT audience trust. If a server-only value is missing or misaligned, the token is rejected with a precise safe error code — not generic `Invalid id_token`.

`GET /api/auth/zklogin/config` reports `legacy_recovery_available` from **server-side** configuration only (public legacy id must appear in `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`).

## How identity matching works

- **Primary key:** Google `sub` (OAuth subject) in `sui_zklogin_identities.oauth_sub`
- **Never:** email-only lookup or account takeover
- **Address derivation:** `sub + iss + aud + user_salt` (Mysten `jwtToAddress`)
- **Preserved:** existing `user_salt`, Sui address, credentials, claims, receipts, wallet bindings, audit history

## User flow

1. **Continue with Google** — canonical OAuth client
2. **Use an existing Passport** — legacy OAuth client (only when `legacy_recovery_available` is true)

If a user tries the canonical path but their identity was created with the legacy client, the API returns `409 zklogin_oauth_audience_mismatch` with `legacy_recovery_available: true` when server-aligned legacy recovery is configured.

Legacy recovery **does not** create new accounts — unknown `oauth_sub` on the legacy path returns `404 zklogin_no_existing_account`.

## Safe API error codes

| Code | Meaning |
|------|---------|
| `zklogin_invalid_token` | Cryptographic JWT verification failed |
| `zklogin_untrusted_audience` | JWT `aud` not in server allowlist |
| `zklogin_not_configured` | No trusted server audiences configured |
| `zklogin_legacy_not_configured` | Legacy recovery path unavailable (server allowlist missing) |
| `zklogin_legacy_client_required` | Wrong OAuth client for legacy path |
| `zklogin_no_existing_account` | Unknown legacy identity |
| `zklogin_oauth_audience_mismatch` | Canonical token for legacy identity |
| `zklogin_session_mint_failed` | Browser session cookie could not be minted |

## Vercel Production configuration

Set **all four** variables in the Production environment:

```bash
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>
GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>
NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID=<legacy-client-id>
GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS=<legacy-client-id>
```

### Variable relationships

```
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID   → browser OAuth redirect (canonical)
GOOGLE_ZKLOGIN_CLIENT_ID                 → server JWT aud verification (canonical)

NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID → browser OAuth redirect (legacy recovery)
GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS            → server JWT aud verification (legacy)
```

The canonical pair and legacy pair must each use the **same client id value**. The public var launches OAuth; the server var authorizes the returned JWT. Setting only the `NEXT_PUBLIC_*` var does **not** enable server trust.

### Deployment steps

1. In Vercel → Project → Settings → Environment Variables → **Production**:
   - Add or correct `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` to match `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID`
   - Confirm `GOOGLE_ZKLOGIN_CLIENT_ID` matches `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID`
2. **Redeploy Production** (required after any `NEXT_PUBLIC_*` change — Next.js inlines them at build time; server-only changes take effect on next deployment without rebuild if only `GOOGLE_*` changed, but redeploy anyway for consistency)
3. Verify `GET /api/auth/zklogin/config` returns `legacy_recovery_available: true`
4. Test **Use an existing Passport** with a known legacy admin account

### Preview / local

Mirror the same four variables in Preview or `.env.local` as needed. Assign Production and Preview separately when values differ.

**Client bundle note:** `NEXT_PUBLIC_*` must be read via direct `process.env.NEXT_PUBLIC_…` property access in `lib/sui/zklogin/clientEnv.ts`.

Redirect URIs for **both** OAuth clients must include `{origin}/auth/zklogin/callback`.

## Rotation and deprecation

1. Enable recovery — set all four env vars; redeploy; verify legacy sign-in.
2. Migrate users — self-serve via legacy path; no DB migration.
3. Deprecate — remove legacy vars after zero legacy sign-ins; redeploy.
4. Google Console — disable legacy OAuth client only after env vars are removed.

## Database migrations

**None required.**

## Limitations

- Users with legacy identities must use **Use an existing Passport**.
- Each legacy OAuth client must be explicitly listed in `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`.
- Public browser configuration alone cannot enable legacy JWT trust.
