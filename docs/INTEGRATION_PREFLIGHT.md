# Integration preflight

Read-only checks for **configuration and data drift** before an Abraxas deployment or partner launch. Safe to run locally and in CI without mutating Supabase or calling admin routes.

## Command

```bash
# Static checks only (no live HTTP / Supabase)
npm run integration:preflight

# Production integration probe (Good Trouble pilot defaults)
INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz \
INTEGRATION_PREFLIGHT_PARTNER_ID=good-trouble-cannabis \
INTEGRATION_PREFLIGHT_POLICY_ID=good-trouble-retail-v1 \
INTEGRATION_PREFLIGHT_RETURN_URL=https://abraxasworld.xyz/good-trouble/enter \
npm run integration:preflight

# Full partner row + allowlist validation (requires read-only service role)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz \
npm run integration:preflight
```

## Environment variables

| Variable | Required | Default (docs / examples) | Purpose |
|----------|----------|---------------------------|---------|
| `INTEGRATION_PREFLIGHT_BASE_URL` | No | *(empty — static checks only)* | Live HTTP probes (`/api/credentials/public-key`, `/api/trust/status`, OpenAPI, `/api/protocol/compatibility`) |
| `INTEGRATION_PREFLIGHT_PARTNER_ID` | No | `good-trouble-cannabis` | Partner row to validate |
| `INTEGRATION_PREFLIGHT_POLICY_ID` | No | `good-trouble-retail-v1` | Active policy to validate |
| `INTEGRATION_PREFLIGHT_RETURN_URL` | No | `{BASE_URL}/good-trouble/enter` or canonical GT enter URL | Callback allowlist match |
| `INTEGRATION_PREFLIGHT_PRODUCTION_MODE` | No | `true` when `BASE_URL` is `https://abraxasworld.xyz` | Treat HTTP/Supabase gaps as **FAIL** instead of **PENDING** |
| `NEXT_PUBLIC_SUPABASE_URL` | No | — | Enables live partner/policy/allowlist probes |
| `SUPABASE_SERVICE_ROLE_KEY` | No | — | Read-only Supabase selects (never written by this script) |

**No secrets are hardcoded.** Defaults reference the Good Trouble pilot ids only.

## Check matrix

Each check is labeled **PASS**, **FAIL**, **PENDING**, or **BLOCKED**.

| Check | Without base URL | With base URL | With Supabase |
|-------|------------------|---------------|---------------|
| Schema migrations on disk (039, 033, 036, 049) | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Partner Flow OpenAPI receipt + callback contract | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Env vars avoid `abraxas-app.vercel.app` | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Public-key issuer matches expected origin | PENDING | PASS/FAIL | PASS/FAIL |
| Trust signing enabled (`signing_configured`) | PENDING | PASS/FAIL | PASS/FAIL |
| Deployed OpenAPI canonical server | PENDING | PASS/FAIL | PASS/FAIL |
| Compatibility manifest endpoint (`GET /api/protocol/compatibility`) | PENDING | PASS/FAIL | PASS/FAIL |
| Compatibility manifest frozen contract (version, origin, paths, callback, receipt fields) | PENDING | PASS/FAIL | PASS/FAIL |
| Compatibility manifest has no `abraxas-app.vercel.app` | PENDING | PASS/FAIL | PASS/FAIL |
| Partner row exists | PENDING | PENDING | PASS/FAIL |
| Policy active + partner match | PENDING | PENDING | PASS/FAIL |
| `allowed_return_urls` non-empty, no stale host | PENDING | PENDING | PASS/FAIL |
| Callback URL allowlist match | PENDING | PENDING | PASS/FAIL |
| Onboarding fields (`is_external`, `onboarding_checklist`) | PENDING | PENDING | PASS/FAIL |

**Exit code:** `0` unless any check is **FAIL**. **PENDING** and **BLOCKED** do not fail CI by design.

## Production mode

When `INTEGRATION_PREFLIGHT_BASE_URL` is `https://abraxasworld.xyz` (or `INTEGRATION_PREFLIGHT_PRODUCTION_MODE=true`):

- Public-key issuer must be `https://abraxasworld.xyz` (not `abraxas-app.vercel.app`)
- `signing_configured` must be `true` on `/api/trust/status`
- `GET /api/protocol/compatibility` must return `compatibility_version` **1.0.0**, `canonical_origin` **https://abraxasworld.xyz**, frozen Partner Flow paths/callback/receipt fields aligned with `lib/protocol/partnerFlowCompatibilityManifest.ts`, and no `abraxas-app.vercel.app` in the response body
- Missing partner/policy rows are **FAIL**, not **PENDING**

## What requires privileged Supabase access

Cannot be verified without `SUPABASE_SERVICE_ROLE_KEY`:

- Live `public.partners` row and `allowed_return_urls` contents
- Live `public.partner_policies` status and `partner_id` binding
- Runtime `isReturnUrlAllowed` against production data
- Whether migrations 049–052 were applied to production (only migration **files** are checked locally)
- Credential schema seeds, API keys, or verification request history

Cannot be verified without a browser session / holder:

- End-to-end Partner Flow evaluate → Passport → complete → callback
- Receipt signature validity for a real issued receipt

## Related docs

- [Integration readiness reconciliation](./INTEGRATION_READINESS_RECONCILIATION.md)
- [Partner Flow integrator kit](/docs/partner-flow)
- [Partner Flow OpenAPI](/docs/partner-flow-api)
- [Partner onboarding checklist](./PARTNER_ONBOARDING_CHECKLIST.md)
