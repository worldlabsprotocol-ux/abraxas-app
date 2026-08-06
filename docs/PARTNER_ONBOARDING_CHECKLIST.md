# Partner Flow — operator onboarding checklist

**Status:** Operator-run provisioning only. There is **no self-serve partner portal** today.

Use this checklist before a third-party protocol or app redirects holders to Abraxas Partner Flow in production.

**Second relying-party pilot:** operator runbook with conformance + live flow steps — `docs/SECOND_PARTNER_PILOT_RUNBOOK.md`

---

## Before you start

- [ ] Confirm integration path: **Partner Flow** (`/docs/partner-flow`) — browser redirect + public receipt verification
- [ ] Canonical production host: `https://abraxasworld.xyz`
- [ ] Required Supabase schema applied (`partners.allowed_return_urls`, `partners.is_external`, `partner_policies`) — see migration audit notes in engineering docs
- [ ] Abraxas signing configured in production (`GET /api/trust/status` → `signing=true`)

---

## 1. Partner row (`public.partners`)

| Field | Requirement |
|-------|-------------|
| `partner_id` | Unique stable identifier (e.g. `your-protocol-v1`) — used in redirect URLs and receipts |
| `company` | Legal or display name |
| `status` | `pilot` or `active` |
| `is_external` | `true` for third-party relying parties |
| `assigned_policy_id` | Primary policy id (informational; flow uses `policy_id` query param) |
| `allowed_environments` | `sandbox` for pilot; add `production` when promoting API keys |
| **`allowed_return_urls`** | **Exact HTTPS callback URL(s)** your app will use — prefix match on origin + path |

**Fail-closed:** If `allowed_return_urls` is empty or missing your callback, Partner Flow returns **400** `return_url is not allowlisted`.

Example allowlist entry:

```
https://your-app.example.com/auth/abraxas/callback
```

Do **not** rely on implicit demo URLs. Each callback must be explicitly provisioned.

---

## 2. Policy row (`public.partner_policies`)

| Field | Requirement |
|-------|-------------|
| `id` | Policy id passed as `policy_id` in `/partner/verify` |
| `partner_id` | Must match `partner_id` in redirect |
| `version` | Integer; pinned on issued receipts |
| `status` | `active` |
| `rules_json` | Required claims, `session_receipt_hours`, `minimum_age`, consent flags, etc. |

Policy rules are evaluated at receipt issuance. Partners receive **derived claims only** (`over_21`, `identity_verified`) — never raw ID images or DOB.

---

## 3. Callback URL

- [ ] HTTPS only (localhost HTTP permitted for local dev only if explicitly allowlisted)
- [ ] Path matches production route that runs **server-side** receipt verification
- [ ] One canonical production URL documented with the partner

Partner Flow appends frozen query parameters (no PII):

`status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`

---

## 4. API keys (only if using server APIs)

Partner Flow browser routes (**evaluate / complete / refresh**) do **not** use API keys.

Issue keys only when the partner also calls:

| Scope | APIs |
|-------|------|
| `verify:requests` | `POST /api/v1/verify/authorize`, `GET /api/v1/verify/decisions/{id}`, verification-requests |
| `verify:credential` | `POST /api/credentials/verify` |

Keys are issued at `/admin/partners` by Abraxas operators. **Never** embed `abx_live_…` or `abx_test_…` in browser code.

---

## 5. Partner application checklist

- [ ] Redirect link built: `https://abraxasworld.xyz/partner/verify?partner_id=…&policy_id=…&return_url=…`
- [ ] Callback handler fetches `GET /api/receipts/{receipt_id}/public`
- [ ] Server validates: `signature_valid`, `decision_result === approved`, `status === active`, non-expired `expires_at`, `production_usable === true`, matching `partner_id` and `policy_id`
- [ ] Example verifier reviewed: `examples/partner-flow-web-rp/`
- [ ] IAT / pilot evidence captured (decision_id, receipt_id, `flow_trace_id`)

---

## 6. What we do not provision automatically

- Self-serve partner signup
- Automatic allowlist of partner domains
- `goodtrouble.live` or other third-party origins without explicit operator approval
- Policy changes on existing rows without a migration / change request

---

## References

- Integrator guide: `/docs/partner-flow`
- Internal flow doc: `docs/PARTNER_FLOW_INTEGRATION.md`
- Frozen contract: `docs/PROTOCOL_COMPATIBILITY.md`
- Example callback verifier: `examples/partner-flow-web-rp/verify-callback.mjs`
