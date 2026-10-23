# Partner membership invitation grant (operational)

Use when an existing Launchpad sandbox application is active but the founder’s native Abraxas account was never linked to its partner tenant.

## Preconditions

1. **Identify the founder account (authoritative)** — while signed in on the demo/staging origin, call `GET /api/auth/native/session`. Use the returned `account_id` (`abx_ac_*`). Do not infer ownership from account creation order or database sorting.
2. **Platform operator authorization** — caller must pass `requireAdminRouteAccess` (admin email session or `ADMIN_PIN` on non-production origins).
3. **Explicit ownership attestation** — the admin request must set `account_ownership_verified: true` only after step 1 is confirmed with the founder.

## Grant request

`POST /api/admin/native-accounts/partner-membership-invite`

```json
{
  "account_id": "abx_ac_…",
  "partner_id": "studio-accept-wc-1792620888278-6a4a2447dfc8",
  "application_id": "fbea93d2-6660-428d-85c3-8c4e12d89b05",
  "reason": "Founder account confirmed via native session; link existing sandbox app for Launchpad resume.",
  "account_ownership_verified": true
}
```

Grant method recorded: `invitation` in `abraxas_account_partner_membership_grants`. Role: `operator` (Launchpad console only).

## After grant

1. `POST /api/launchpad/auth/session` with `{ "application_id": "…" }` and the native account cookie — no API key.
2. Add staging callback via Launchpad **or** admin return URL helper with `application_id` so both `partners` and `partner_launchpad_applications` allowlists stay aligned.

## Metering note

Receipt metering is best-effort at completion time. If `partner_metering_events` is empty for an approved receipt, check deployment env (`SUPABASE_SERVICE_ROLE_KEY`) and whether the completion path returned `replay_status: "issued"` (metering skips idempotent replays).
