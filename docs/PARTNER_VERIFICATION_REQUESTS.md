# Partner Verification Requests — Step 4 Portable Reuse Loop

Step 4 closes the generic **partner → holder → decision** loop that Cielo Step 3 proved for first-party flows only.

## Flow

```
Partner backend                    Holder (Passport)                 Partner backend
     │                                    │                                │
     │ POST /api/v1/verification-requests │                                │
     │ ─────────────────────────────────► │                                │
     │ ◄ consent_url + request_id         │                                │
     │                                    │                                │
     │ redirect holder to consent_url     │                                │
     │ ─────────────────────────────────► │                                │
     │                                    │ GET …/verification-requests/{id}
     │                                    │ POST …/consent (session cookie) │
     │                                    │ or POST …/decline               │
     │                                    │                                │
     │ GET /api/v1/decisions/{id}/status  │                                │
     │ ◄──────────────────────────────────┼────────────────────────────────│
     │ decision + claims + valid_until    │                                │
```

## Partner API (server-side only)

Auth: `Authorization: Bearer abx_live_…` or `X-Abraxas-Api-Key: abx_test_…`

Keys are issued at `/admin/partners`. Scope: `verify:requests` (or `verify:credential`).

### Create request

```http
POST /api/v1/verification-requests
Content-Type: application/json
Authorization: Bearer abx_live_YOUR_KEY

{
  "policy_id": "cielo-verified-guest-v1",
  "requested_action": "verified_rate",
  "sui_address": "0x…"
}
```

Response:

```json
{
  "request_id": "uuid",
  "consent_url": "https://abraxas-app.vercel.app/passport?verify_request=uuid",
  "expires_at": "ISO8601",
  "status": "pending"
}
```

Redirect the holder to `consent_url`. Never embed API keys in the browser.

### Poll decision

After the holder approves:

```http
GET /api/v1/decisions/{decision_id}/status
Authorization: Bearer abx_live_YOUR_KEY
```

Returns `approved`, `denied`, or `manual_review` with `claims`, `valid_until`, and `reason_codes`.

### Direct policy check (no consent ceremony)

For server-side checks when you already hold the subject wallet:

```http
POST /api/v1/policies/evaluate
{ "policy_id": "…", "sui_address": "0x…" }
```

## Holder experience

1. Partner redirects to `/passport?verify_request={id}`
2. **ConsentCeremony** shows selective disclosure preview
3. Holder **Approve** → session-authenticated consent → policy decision
4. Holder **Decline** → request cancelled, no claims shared
5. History appears under **Partner access** on Passport

Consent and decline use the httpOnly browser session (`ABRAXAS_BROWSER_SESSION_SECRET`) — not client-supplied wallet addresses.

## Pilot demo (no partner key)

Signed-in holders can test the loop from Passport:

- **Test portable reuse loop** → `POST /api/passport/demo-partner-request`
- Creates a request from partner `abraxas-pilot` with policy `abraxas-core-v1`
- Redirects into the consent ceremony

## Policies (seeded in migration 018 / 026)

| Policy ID | Use |
|-----------|-----|
| `abraxas-core-v1` | Account-only — good for demo |
| `cielo-verified-guest-v1` | Wallet-bound guest pilot |
| `abraxas-booking-v1` | Identity + wallet for high-trust booking |
| `abraxas-rwa-us-v1` | US RWA eligibility (pilot) |

## Database

Uses migration **018** tables:

- `verification_requests`
- `consent_receipts`
- `verification_decisions`
- `audit_events`

Optional migration **027** adds `verify:requests` scope to existing partner keys.

## Local test checklist

1. Run migrations 018, 024, 025, 026, 027
2. Sign in at `/passport`, bind wallet
3. Click **Test portable reuse loop** → approve consent
4. Confirm partner access history shows the receipt
5. Server-side: create request with partner key, poll decision status

## Related

- Step 3: Cielo verified-rate request loop (first-party pilot)
- Step 2: Partner API keys (`/admin/partners`)
- `/docs/credential-portability` — JWT verify + integrator endpoints
