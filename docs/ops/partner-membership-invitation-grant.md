# Partner membership invitation grant (operational)

Recover Launchpad access to an **existing** sandbox application when the reveal-once API key is unavailable.

## Security model

- **Account identity** is proven by the founder’s **native account session** minting a **server-signed, single-use recovery attestation** (15 minutes).
- **Grant authority** is proven by **platform admin** authentication (`requireAdminRouteAccess`).
- **`account_ownership_verified` is not accepted** on the admin endpoint.
- Grants are **sandbox-only**, **operator** role, **insert-only** (no silent role elevation), and **blocked on Production app origins**.

## Founder step — mint attestation

While signed in to the demo/staging origin:

`POST /api/auth/native/partner-membership-recovery-attestation`

```json
{
  "partner_id": "studio-accept-wc-1792620888278-6a4a2447dfc8",
  "application_id": "fbea93d2-6660-428d-85c3-8c4e12d89b05"
}
```

Response includes `account_id` and `recovery_attestation` (JWT). Provide the token to a platform administrator.

Confirm identity via `GET /api/auth/native/session` if needed — use the same browser session that minted the attestation.

## Administrator step — apply grant

`POST /api/admin/native-accounts/partner-membership-invite`

```json
{
  "account_id": "<from attestation response>",
  "partner_id": "studio-accept-wc-1792620888278-6a4a2447dfc8",
  "application_id": "fbea93d2-6660-428d-85c3-8c4e12d89b05",
  "reason": "Founder recovery attestation verified; link existing sandbox Launchpad app.",
  "recovery_attestation": "<JWT from founder step>"
}
```

## After grant

1. `POST /api/launchpad/auth/session` with `{ "application_id": "…" }` and the native account cookie.
2. Add staging callback via Launchpad return URLs or admin onboarding return URLs with `application_id`.

## Database

Migration `148_partner_membership_recovery_attestation.sql` must be applied on the target demo database before attestations persist.
