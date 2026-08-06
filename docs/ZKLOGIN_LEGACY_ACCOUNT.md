# zkLogin legacy account sign-in

Existing Abraxas users who registered under a prior Google OAuth client cannot sign in after the OAuth client ID changes, because zkLogin address derivation includes JWT `aud` (audience). This document describes the **explicit legacy recovery path** — not a rollback of audience validation.

## How identity matching works

- **Primary key:** Google `sub` (OAuth subject) in `sui_zklogin_identities.oauth_sub`
- **Never:** email-only lookup or account takeover
- **Address derivation:** `sub + iss + aud + user_salt` (Mysten `jwtToAddress`)
- **Preserved:** existing `user_salt`, Sui address, credentials, claims, receipts, wallet bindings, audit history
- **Not done:** salt rotation, identity deletion, wallet reassignment, silent duplicate rows

## User flow

1. **Continue with Google** — canonical OAuth client (new registrations + users already on the new client)
2. **Existing account sign-in** — launches the configured **legacy** Google OAuth client when `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID` is set

Copy shown to users:

> Registered before our sign-in update? Use **Existing account sign-in**. We found your existing Abraxas account — continue with the account configuration that created it.

If a user tries the canonical path but their identity was created with the legacy client, the API returns `409 zklogin_oauth_audience_mismatch` with `legacy_recovery_available: true` when legacy recovery is configured.

Legacy recovery **does not** create new accounts — unknown `oauth_sub` on the legacy path returns `404 zklogin_no_existing_account`.

## Environment variables

| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Public | Yes | Canonical Google OAuth client for normal sign-in |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Server | No | Server JWT audience override (preferred in production) |
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID` | Public | For recovery | Legacy client used by **Existing account sign-in** OAuth redirect |
| `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` | Server | For recovery | Comma-separated legacy client IDs accepted in JWT `aud` verification |

**Trusted audiences** = canonical client ID + all legacy client IDs. Any other `aud` is rejected.

### Production

```bash
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>
GOOGLE_ZKLOGIN_CLIENT_ID=<canonical-client-id>          # optional server override
NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID=<legacy-client-id>
GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS=<legacy-client-id>    # must include the same id as NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID
```

### Preview / local

Set the same variables in the preview environment. Legacy recovery is enabled **only** when `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID` is set **and** that exact value appears in `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS`. Server-only or public-only configuration keeps recovery disabled.

Redirect URIs for **both** OAuth clients must include:

`{origin}/auth/zklogin/callback`

(same-origin per deployment host — see `lib/sui/zklogin/config.ts`).

If the public legacy client id and server allowlist disagree, the **Existing account sign-in** button stays hidden and `legacy_recovery_available` is `false`.

## Rotation and deprecation

1. **Enable recovery** — add legacy client env vars; deploy; verify `Existing account sign-in` works for a test legacy account.
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

- Users must use **Existing account sign-in** if their account was created with the legacy OAuth client — automatic cohort detection before Google login is not possible without weakening security.
- Each legacy OAuth client must be explicitly allowlisted; arbitrary historical clients are not accepted.
- Google OAuth client IDs are public identifiers but are not echoed in end-user UI copy.
