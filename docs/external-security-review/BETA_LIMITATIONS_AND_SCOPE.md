# Beta Limitations and Review Scope

**Purpose:** Set reviewer expectations. Items here are **known gaps or deferred work**, not assertions that they are acceptable long-term.

---

## Known beta limitations

### Authentication and sessions

| Limitation | Detail | Reference |
|------------|--------|-----------|
| Admin auth fragmentation | Multiple parallel models (PIN, `ADMIN_SECRET`, email allowlist) | `docs/SECURITY_THREAT_MODEL.md` § Admin |
| Session secret fallback | `ABRAXAS_BROWSER_SESSION_SECRET` may fall back to signing key material if unset | `lib/auth/browserSession.ts` |
| Credential / status enumeration | Some holder status endpoints queryable by Sui address without strong rate limits | `app/api/identity/status/route.ts`, `app/api/credentials/me/route.ts` |
| zkLogin dev salt | Dev environments may use ephemeral salt (documented operator behavior) | `docs/ZKLOGIN_BACKEND_SETUP.md` |

### IDV and identity pipeline

| Limitation | Detail | Reference |
|------------|--------|-----------|
| Public IDV sync endpoint | `POST /api/idv/sync-decision` lacks authentication in current code | `app/api/idv/sync-decision/route.ts` |
| Veriff webhook only | Inbound webhook signed; sync path is separate surface | `docs/SECURITY_THREAT_MODEL.md` |

### Partner Flow and receipts

| Limitation | Detail | Reference |
|------------|--------|-----------|
| Migration rollout | Migrations 053 (idempotency) and 054 (audit index) may not be applied in all environments | `supabase/migrations/053_*.sql`, `054_*.sql` |
| Audit best-effort on some paths | Error-path audits are best-effort; success paths require persistence | `lib/partner/partnerFlowAudit.ts` |
| `flow_trace_id` is response metadata | Not an authoritative client input; server derives from VR / decision / receipt | `lib/partner/partnerFlowAudit.ts` |
| Refresh replacement linkage | `replaced_receipt_id` populated on supersede path; optional in historical traces | `lib/partner/relyingPartyFlow.ts` |

### Infrastructure and operations

| Limitation | Detail | Reference |
|------------|--------|-----------|
| Service role concentration | Server routes use service role; authorization is application-layer | `lib/supabase/admin.ts` |
| RLS not relied on for app auth | Treat every API route as the authorization boundary | `docs/SECURITY_THREAT_MODEL.md` |
| Multi-host history | Legacy `abraxas-app.vercel.app` references may exist in env or DB | `integration:preflight` stale-host check |
| No WAF / rate-limit doc in repo | Edge protection is deployment-specific (Vercel) | — |

### Evidence gaps

| Limitation | Detail |
|------------|--------|
| No in-repo pentest report | External review not yet completed |
| IAT walkthrough may lag code | Compare walkthrough SHA to reviewed commit |
| E2E holder flow not in CI | Browser session + Passport + complete requires manual or scripted E2E |

---

## Explicit out-of-scope areas (initial external review)

The following are **out of scope** unless separately contracted:

| Area | Reason |
|------|--------|
| Sui Move passport contracts | On-chain logic; separate audit surface (`sui/abraxas_passport/`) |
| MoonPay / fiat integrations | Third-party payment SDK (`@moonpay/platform-sdk-web`) |
| Marketplace / unrelated product UI | Not part of Verify trust infrastructure |
| Good Trouble partner-specific UI pages | Consumer UX; review Partner Flow **APIs** and receipts only |
| Supabase platform security | Vendor responsibility; review **usage patterns** only |
| Google OAuth / Veriff platform security | Vendor responsibility; review **integration** only |
| Vercel platform security | Vendor responsibility; review **deployment config** only |
| Social engineering / physical access | Standard exclusion |
| Load / DDoS testing | Coordinate with operator; not in default scope |
| Production data exfiltration | Use read-only probes; no bulk PII export |

---

## In-scope (default package)

- Public and partner APIs under `app/api/` (especially `/api/v1/partner-flow/*`, `/api/receipts/*`, `/api/auth/*`)
- Credential and decision receipt signing and verification
- Browser session and zkLogin registration flows
- Partner API key authentication and scoping
- Return URL allowlist enforcement
- Partner Flow idempotency and audit metadata
- Supabase service-role usage from server code
- Admin identity review and credential issuance routes
- Operator scripts: `integration:preflight`, `audit:partner-flow-trace`

---

## Environment assumptions for live testing

| Assumption | Value |
|------------|-------|
| Production beta URL | `https://abraxasworld.xyz` |
| Pilot partner | `good-trouble-cannabis` (example) |
| Pilot policy | `good-trouble-retail-v1` (example) |

Operators should provide reviewers: deployed commit SHA, Supabase read-only or staging credentials (if agreed), and a sample `flow_trace_id` / `receipt_id` for trace audit — **never production PII dumps**.
