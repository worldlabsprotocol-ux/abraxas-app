# Partner Flow — operator onboarding checklist

**Status:** External design partners can self-validate sandbox integration via `/developers/partner` after operator promotion. Production provisioning remains operator-run.

Use this checklist before a third-party protocol or app redirects holders to Abraxas Partner Flow in production.

**External design partner playbook (share with approved partners):** `docs/EXTERNAL_DESIGN_PARTNER_PILOT.md`

**Second relying-party pilot:** operator runbook with conformance + live flow steps — `docs/SECOND_PARTNER_PILOT_RUNBOOK.md`

**Admin console (pilot provisioning):** `/admin/partners` — `docs/PARTNER_ONBOARDING_CONSOLE.md`

**Design partner promotion:** `/admin/design-partners` — issues default verify-only sandbox key

---

## Secure handoff package (external pilot)

Deliver to the partner through a **secure channel** after promote at `/admin/design-partners`. Do not paste API keys or signing secrets into reviewer notes, tickets, or email if a safer channel is available.

| Item | Operator action |
|------|-----------------|
| `partner_id` | From promote — share with partner |
| `policy_id` | Active sandbox policy assigned to the partner row |
| `return_url` | Exact HTTPS callback URL added to `allowed_return_urls` |
| Sandbox API key | One-time reveal at promote — scopes `verify:credential`, `verify:registry` by default |
| Partner portal | `https://abraxasworld.xyz/developers/partner` |
| Partner Flow docs | `https://abraxasworld.xyz/docs/partner-flow` |
| External pilot playbook | `docs/EXTERNAL_DESIGN_PARTNER_PILOT.md` |

**Optional webhook track (separate step at `/admin/partners`):**

| Item | Operator action |
|------|-----------------|
| API key with `webhooks:read` | Separate key — not included on default promote |
| Webhook endpoint URL | Registered and delivery enabled by ops |
| Webhook signing secret | Deliver securely — partner validates signatures in their receiver |

Remind partners: credentials stay **server-side only**. Sandbox receipts never authorize Production access.

---

## Operator evidence checklist (sandbox-complete)

Record evidence for sandbox-complete review. **Do not store API keys or signing secrets** in reviewer notes or application records.

### Provisioning

- [ ] `partner_id`, `policy_id`, and allowlisted `return_url` documented (IDs only — no secrets)
- [ ] Partner received secure handoff package
- [ ] Partner portal sign-in confirmed at `/developers/partner`

### Track A — Partner Flow

- [ ] End-to-end sandbox flow completed — **manual** partner confirmation
- [ ] Sample `receipt_id` captured (no PII)
- [ ] `signature_valid === true` on public receipt — **manual** partner confirmation
- [ ] `partner_id` and `policy_id` match provisioned values — **manual** partner confirmation
- [ ] `decision_result === approved` where applicable — **manual** partner confirmation
- [ ] Partner acknowledges `production_usable: false` and `currently_valid: false` as expected sandbox behavior — **manual**
- [ ] `npm run partner:conformance` exit 0 (if partner ran harness)

### Track B — Webhooks (optional)

- [ ] Separate `webhooks:read` key issued — operator record
- [ ] Sandbox test reached **queued** — **manual** partner confirmation
- [ ] Sandbox test reached **HTTP delivered** — **manual** partner confirmation (transport only)
- [ ] **Signature verified by partner receiver** — **manual** partner confirmation (never inferred from delivery history)

### Production promotion (separate review — not sandbox-complete)

- [ ] Sandbox-complete evidence reviewed
- [ ] Production activation requested and approved on its own timeline
- [ ] Live keys and production policy promotion tracked separately from sandbox pilot

---

## Before you start

- [ ] Confirm integration path: **Partner Flow** (`/docs/partner-flow`) — browser redirect + public receipt verification
- [ ] Understand **two independent tracks**: Partner Flow vs Webhooks (optional, requires `webhooks:read`)
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

## 4. API keys — least privilege defaults

Partner Flow browser routes (**evaluate / complete / refresh**) do **not** use API keys.

**Design partner promote** (`/admin/design-partners`) issues default scopes:

| Scope | APIs |
|-------|------|
| `verify:credential` | `POST /api/credentials/verify` |
| `verify:registry` | Registry lookup APIs |

**Optional webhook track** — separate operator step at `/admin/partners`:

| Scope | APIs |
|-------|------|
| `webhooks:read` | Webhook delivery history and sandbox test enqueue |

Issue additional keys only when the partner also calls:

| Scope | APIs |
|-------|------|
| `verify:requests` | `POST /api/v1/verify/authorize`, `GET /api/v1/verify/decisions/{id}`, verification-requests |

Keys are issued at `/admin/partners` by Abraxas operators. **Never** embed `abx_live_…` or `abx_test_…` in browser code.

---

## 5. Partner application checklist — Track A (Partner Flow)

- [ ] Operator supplies `partner_id`, `policy_id`, and allowlisted `return_url` — partners cannot self-build a complete entry URL
- [ ] Redirect link template: `https://abraxasworld.xyz/partner/verify?partner_id=…&policy_id=…&return_url=…`
- [ ] Callback handler fetches `GET /api/receipts/{receipt_id}/public`
- [ ] Server validates sandbox receipts: `signature_valid`, `decision_result === approved`, matching `partner_id` and `policy_id`
- [ ] **`production_usable: false` and `currently_valid: false` are expected** for sandbox policies (e.g. `production_not_usable:false`)
- [ ] **Sandbox receipts never authorize Production access** — reserve `currently_valid === true` for production gates only
- [ ] Example verifier reviewed: `examples/partner-flow-web-rp/`
- [ ] IAT / pilot evidence captured (decision_id, receipt_id, `flow_trace_id`)

---

## 6. Partner application checklist — Track B (Webhooks, optional)

- [ ] Separate API key with `webhooks:read` issued at `/admin/partners`
- [ ] Webhook endpoint registered and delivery enabled by Abraxas ops
- [ ] User-initiated sandbox test: `partner.webhook.test` with `test: true`
- [ ] **`queued` ≠ `delivered`** — queued means accepted for async delivery
- [ ] **`delivered` = HTTP delivery only** — not signature verification, not receipt validation
- [ ] **Signature verified by partner's receiver** — manual acknowledgment only; never inferred from delivery history
- [ ] **`partner.webhook.test` is never validated via `GET /api/receipts/{id}/public`**

---

## 7. What we do not provision automatically

- Self-serve partner signup
- Automatic allowlist of partner domains
- `webhooks:read` on default promote keys
- `goodtrouble.live` or other third-party origins without explicit operator approval
- Policy changes on existing rows without a migration / change request

---

## References

- **External design partner playbook:** `docs/EXTERNAL_DESIGN_PARTNER_PILOT.md`
- Integrator guide: `/docs/partner-flow`
- External design partner sandbox: `/docs/partner-flow#external-design-partner-sandbox`
- Partner portal: `/developers/partner`
- Internal flow doc: `docs/PARTNER_FLOW_INTEGRATION.md`
- Frozen contract: `docs/PROTOCOL_COMPATIBILITY.md`
- Example callback verifier: `examples/partner-flow-web-rp/verify-callback.mjs`
