# Partner Onboarding Console

**Route:** `/admin/partners` (Onboarding tab)  
**APIs:** `/api/admin/partners/onboarding/*`  
**Auth:** `checkAdminAccess` — admin email allowlist, admin session cookie, or PIN header. No public self-serve onboarding.

---

## Schema / migration assessment

**Result: no additive migration required for this console.**

Existing columns used:

| Table | Columns |
|-------|---------|
| `public.partners` | `partner_id`, `company`, `status`, `is_external`, `allowed_environments`, `allowed_return_urls`, `assigned_policy_id`, `onboarding_checklist`, `use_case`, `legal_entity` (migrations 025, 029, 032, 036, 039) |
| `public.partner_policies` | composite PK `(id, version)`, `status` draft/active/deprecated, `rules_json` (018 + 055) |
| `public.audit_events` | append-only admin configuration audit via `appendAuditEvent` |

**Operator apply still required (not part of this PR):** migrations 055/056 for immutable policy publish RPC in production Supabase.

---

## Operator workflow

### 1. Open console
1. Sign in with allowlisted admin Google account **or** enter admin PIN at `/admin/partners`.
2. Select **Onboarding** tab.

### 2. Create pilot partner
1. Enter `partner_id`, company name, optional use case.
2. Click **Create pilot partner** — status is always `pilot` (or `recruiting` via API); never `active` on create.
3. Audit: `admin.partner.create`

### 3. Add callback URLs
1. Select partner in list.
2. Enter exact HTTPS callback URL (no query/fragment).
3. Click **Add URL** — validated with `validatePartnerReturnUrlFormat` (fail-closed).
4. Audit: `admin.partner.return_url.add`

### 4. Create draft policy
1. Enter `policy_id` and optional display name.
2. Click **Create draft policy** — inserts `partner_policies` v1 `draft` with default pilot rules (`sandbox_only: true`).
3. Audit: `admin.partner.policy.draft_create`

### 5. Publish policy (immutable workflow)
1. Click **Publish draft** — calls `publish_partner_policy_draft` RPC (deprecates prior active version if any).
2. Active policy rules cannot be edited; create new draft from `/api/admin/policies/versions` for changes.
3. Audit: `admin.partner.policy.publish`

### 6. Conformance + live pilot
1. Copy **conformance command** from checklist when readiness shows ready.
2. Run `npm run partner:conformance` locally with env vars.
3. Complete live flow per `docs/SECOND_PARTNER_PILOT_RUNBOOK.md`.

### 7. API keys (optional)
Switch to **API keys** tab — issue `abx_test_` / `abx_live_` keys. Full secret shown once only.

---

## API reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/partners/onboarding` | List partners + readiness |
| GET | `/api/admin/partners/onboarding?partner_id=` | Partner detail + checklist |
| POST | `/api/admin/partners/onboarding` | Create pilot/recruiting partner |
| POST | `/api/admin/partners/onboarding/return-urls` | Add validated callback URLs |
| POST | `/api/admin/partners/onboarding/policies` | `create_initial_draft`, `update_draft`, `publish` |

Responses never include API key secrets or `SUPABASE_SERVICE_ROLE_KEY`.

---

## Readiness view

Per-partner read-only checks:

- **partner_row** — `is_external` partner exists
- **active_policy** — active `partner_policies` row
- **callback_allowlist** — non-empty, valid URL formats
- **conformance_config** — active policy + primary callback URL present

Overall **ready** when all four pass.

---

## Security notes

- Reuses existing return-URL allowlist rules (`lib/connect/returnUrlAllowlist.ts` at runtime; format validation at configure time).
- Does not change Partner Flow evaluate/complete semantics, OAuth, zkLogin, or receipt validation.
- Admin audits use non-PII metadata only (`partner_id`, counts, policy version).
