# Abraxas HTTPS integration (external apps)

No SDK required. Same contract as `AbraxasPartnerKit.createVerificationRequest` hosted-handoff mode.

## Create hosted verification

```http
POST {ABRAXAS_BASE_URL}/api/v1/partner-handoff
Authorization: Bearer {ABRAXAS_API_KEY}
Content-Type: application/json
X-Abraxas-Application-Id: {ABRAXAS_APPLICATION_ID}

{"runtime":"external_node_https","binding_id":"{optional_binding_id}"}
```

Response (success):

```json
{
  "ok": true,
  "hosted_url": "https://…/partner/verify?…",
  "verify_request": "vr_…",
  "handoff_ref": "…",
  "public_receipt_id": null
}
```

1. Persist `verify_request` in your database.
2. Redirect the holder to `hosted_url` (never expose API key to the browser).

## Callback

Allowlisted `return_url` receives query params including `receipt_id` and optionally `request_id`. **Query params are not authorization.**

Correlate `request_id` with stored `verify_request`, then verify the receipt independently.

## Portable verification (offline enforce)

```http
GET {ABRAXAS_BASE_URL}/api/receipts/{receipt_id}/portable-verification
Accept: application/json
```

Use `@abraxas/independent-verifier` with your out-of-band trust anchor pin. Map to `permit` | `deny` | `indeterminate`.

## Lookup handoff (optional)

```http
GET {ABRAXAS_BASE_URL}/api/v1/partner-handoff/{handoff_ref}
Authorization: Bearer {ABRAXAS_API_KEY}
```

Use when callback timing is uncertain; still verify portable evidence before granting access.
