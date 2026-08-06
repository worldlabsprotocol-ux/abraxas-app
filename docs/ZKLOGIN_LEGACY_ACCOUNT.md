# zkLogin legacy account sign-in

Existing Abraxas users who registered under a prior Google OAuth client cannot sign in after the OAuth client ID changes, because zkLogin address derivation includes JWT `aud` (audience). This document describes the **explicit legacy recovery path** — not a rollback of audience validation.

## Root cause of production "Invalid id_token" on legacy recovery

The legacy path launches Google OAuth with `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID`, but server JWT verification previously required the same value in `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`. When only the public variable was set in Vercel Production, users could reach Google and return with a valid legacy token, but the register route rejected it with a generic **Invalid id_token**.

**Fix:** when `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` is unset, the server now accepts the public legacy client id in its JWT allowlist (OAuth client IDs are public identifiers). Explicit non-empty `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` remains authoritative for rotation and multi-legacy migrations.

## How identity matching works

- **Primary key:** Google `sub` (OAuth subject) in `sui_zklogin_identities.oauth_sub`
- **Never:** email-only lookup or account takeover
- **Address derivation:** `sub + iss + aud + user_salt` (Mysten `jwtToAddress`)
- **Preserved:** existing `user_salt`, Sui address, credentials, claims, receipts, wallet bindings, audit history
- **Not done:** salt rotation, identity deletion, wallet reassignment, silent duplicate rows

## User flow

1. **Continue with Google** — canonical OAuth client (new registrations + users already on the new client)
2. **Use an existing Passport** — launches the configured **legacy** Google OAuth client when server-aligned legacy recovery is available

If a user tries the canonical path but their identity was created with the legacy client, the API returns `409 zklogin_oauth_audience_mismatch` with `legacy_recovery_available: true` when legacy recovery is configured.

Legacy recovery **does not** create new accounts — unknown `oauth_sub` on the legacy path returns `404 zklogin_no_existing_account`.

## Safe API error codes

| Code | Meaning | User-facing tone |
|------|---------|------------------|
| `zklogin_invalid_token` | Cryptographic JWT verification failed | Plain retry guidance |
| `zklogin_untrusted_audience` | JWT `aud` not in trusted allowlist | Use the correct sign-in option |
| `zklogin_not_configured` | No trusted audiences configured | Sign-in temporarily unavailable |
| `zklogin_legacy_not_configured` | Legacy recovery path unavailable | Existing Passport option unavailable |
| `zklogin_legacy_client_required` | Wrong OAuth client for legacy path | Use existing Passport option |
| `zklogin_no_existing_account` | Unknown legacy identity | Non-enumerating, suggests new Passport |
| `zklogin_oauth_audience_mismatch` | Canonical token for legacy identity | Redirect to existing Passport |
| `zklogin_session_mint_failed` | Browser session cookie could not be minted | Retry sign-in |

Responses never include JWTs, emails, OAuth subjects, salts, or wallet addresses.

## Environment variables

| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Public | Yes | Canonical Google OAuth client for normal sign-in |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Server | Recommended | Canonical server JWT audience (falls back to public when unset) |
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID` | Public | For recovery | Legacy client used by **Use an existing Passport** OAuth redirect |
| `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` | Server | Optional | Comma-separated extra legacy client IDs for JWT `aud` verification |

### Variable relationships

```
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID  ↔  GOOGLE_ZKLOGIN_CLIENT_ID
  (same canonical OAuth client; public drives browser OAuth, server verifies JWT aud)

NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID  ↔  GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS
  (same legacy OAuth client when only one legacy client exists;
   server list is authoritative when non-empty)
```

**Trusted audiences** = canonical client ID + effective legacy client IDs. Any other `aud` is rejected.

### Production (recommended)

```bash
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>
GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>
NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID=<legacy-client-id>
GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS=<legacy-client-id>   # recommended explicit mirror
```

Minimum for legacy recovery when ops previously set only the public legacy id:

```bash
NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID=<legacy-client-id>
# GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS may be omitted — server falls back to public legacy id
```

### Preview / local

Set the same variables in the Preview environment (or `.env.local`). Assign **Production** and **Preview** separately in Vercel when values differ.

**Redeploy required:** any change to `NEXT_PUBLIC_*` variables requires a new deployment — Next.js inlines them at build time.

**Client bundle note:** `NEXT_PUBLIC_*` values must be read via direct `process.env.NEXT_PUBLIC_…` property access in client code (`lib/sui/zklogin/clientEnv.ts`). Dynamic `process.env[key]` access is not inlined by Next.js.

Redirect URIs for **both** OAuth clients must include:

`{origin}/auth/zklogin/callback`

The UI loads `GET /api/auth/zklogin/config` to align the **Use an existing Passport** button with server-side `legacy_recovery_available`.

## Rotation and deprecation

1. **Enable recovery** — add legacy client env vars; redeploy; verify **Use an existing Passport** for a test legacy account.
2. **Migrate users** — users self-serve via legacy path; no DB migration required.
3. **Deprecate legacy client** — after support confirms zero legacy sign-ins for an agreed period:
   - Remove `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID`
   - Remove `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`
   - Redeploy
4. **Google Console** — disable legacy OAuth client only after env vars are removed and metrics show no usage.

Do **not** change the canonical client ID back to the legacy value.

## Operator audit metadata

Register route logs structured metadata (no PII):

```json
{
  "event": "zklogin_identity_recovery",
  "login_mode": "legacy_recovery",
  "audience_cohort": "legacy",
  "outcome": "success"
}
```

Fields never include: `sub`, `email`, `user_salt`, `sui_address`, `id_token`, or full client IDs.

## Database migrations

**None required.** Identity rows remain keyed by `oauth_sub`; recovery reuses stored `user_salt`.

## Limitations

- Users must use **Use an existing Passport** if their account was created with the legacy OAuth client — automatic cohort detection before Google login is not possible without weakening security.
- Each legacy OAuth client must be explicitly allowlisted when `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` is set; arbitrary historical clients are not accepted.
- Google OAuth client IDs are public identifiers but are not echoed in end-user UI copy.
