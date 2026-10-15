# Institutional sandbox activation (Build #583)

Customer-ready handoff for engineering teams integrating **organization protocol eligibility** in sandbox without receiving identity evidence.

## Supported entry URL

Production product: [https://abraxasworld.xyz](https://abraxasworld.xyz)

| Step | URL |
|------|-----|
| Policy fit and pack selection | `/developers/integration-studio?pack=sandbox_institutional_protocol_access&path=institutional_eligibility_gate&action=org_protocol_access&category=institutional_eligibility&environment=sandbox` |
| Launchpad provisioning | `/developers/launchpad?template=sandbox_institutional_protocol_access` |
| Independent verifier guide | `/docs/partner-handoff/passport-independent-verifier` |
| Public receipt check | `/verify?mode=receipt` |

## Authentication requirements

Partner Launchpad and Integration Studio authenticate with a **sandbox API key** (`abx_test_…`), not Google OAuth.

1. **Local / preview operator setup**
   - Set `ABRAXAS_BROWSER_SESSION_SECRET` to a random string of at least 16 characters in `.env.local` (required to mint the httpOnly Launchpad browser session cookie after key validation).
   - Restart the dev server after changing secrets.
   - Open `/developers/launchpad?template=sandbox_institutional_protocol_access`, paste a provisioned sandbox API key, and submit **Continue with sandbox key**.
2. **Deployed acceptance (no credential changes in this build)**
   - Use an existing sandbox application key from your Launchpad tenant on `https://abraxasworld.xyz` (or your preview URL).
   - For automated HTTP acceptance, export `BUILD583_SANDBOX_BASE_URL`, `BUILD583_PARTNER_API_KEY`, and optionally `BUILD583_APPLICATION_ID`, then run `npm run build-583:external-institutional-acceptance`.
3. **Google sign-in copy on Passport**
   - Holder Passport may show “Google sign-in unavailable” when zkLogin/OAuth is not configured locally. That is a **holder** surface configuration gap, not Launchpad partner authentication. Do not treat it as proof that institutional sandbox activation failed.
4. After provisioning, use the **sandbox API key** only on your server. Never embed it in browser code or client telemetry.
5. Holder flows use Abraxas Passport holder authentication. Integrators do not receive raw identity documents at authorization time.

## Supported sandbox policy

- **Policy template:** `sandbox_institutional_protocol_access`
- **Pinned policy id:** `sandbox_institutional_protocol_access` (server enforced)
- **Environment:** Sandbox only. Production issuer signing and Production DDL remain blocked until explicit founder authorization.

## Integration configuration

1. Open Launchpad with the institutional template query parameter and **Create test app**.
2. Register an allowlisted **callback URL** (HTTPS for staging, localhost allowed for development).
3. Generate the **starter kit** and deploy server-side verification request creation.
4. Use **Hosted Partner Flow** or the integration kit to open verification for a synthetic sandbox holder.
5. On callback, read `receipt_id` and verify on your server before granting access.

## Callback and security requirements

- Bind every verification to a partner-issued `request_id`. Reject callbacks whose request correlation does not match.
- Verify receipt signatures with Abraxas public trust material. Do not treat Abraxas UI as the trust root.
- Enforce tenant boundaries: policy id, partner id, and application binding must match your Launchpad application.
- Apply replay protection and freshness checks documented in the Partner Integration Kit.

## Independent receipt verification

Use the supported offline verifier (no Supabase trust root):

```bash
npm run build-569:verify-bundle -- --config path/to/institution.json --bundle path/to/presentation-bundle.json
```

Minimal external relying party example:

```bash
npm run example:institutional-rp
```

See `docs/partner-handoff/passport-independent-verifier/README.md` for bundle schema and mandatory checkpoint directories.

## Expected successful result

Launchpad **Institutional sandbox activation** milestones should show, in order:

1. Sandbox application provisioned  
2. Integration configured  
3. Sandbox credentials generated  
4. Integration files connected  
5. Hosted verification ready  
6. First hosted verification initiated  
7. Holder consent completed  
8. Signed decision receipt issued  
9. **Independent receipt verification succeeded**

Time to first independent verify is **measured** only when integration events are persisted with your **application id** attribution.

## Common failures and recovery

| Symptom | Likely cause | Recovery |
|---------|--------------|----------|
| Milestones stuck at credentials | API key not issued | Reveal sandbox key once in Launchpad |
| Consent unavailable | Hosted flow not completed | Run test verification from Launchpad Test step |
| Verify not observed | Server verify not instrumented | Call kit verify path; ensure integration events record success |
| Cross-tenant receipt accepted | Missing tenant binding | Reject receipts whose partner or policy does not match your app |

## Production limitations

- No Production DDL, migrations 136–143, holder backfills, or Production signing without founder authorization.
- Production Supabase project `bztwutzprwsdrtqdpymf` is never a disposable migration target.
- Institutional sandbox pack cannot self-activate Production.

## Evidence you can export

- Launchpad **integration export** API (authenticated): lifecycle timeline without secrets.
- **Integration health** JSON: technical proof stages and partner-safe failure codes.
- Offline verifier JSON result from `build-569:verify-bundle` for audit archives.

## Acceptance harness (engineering)

```bash
npm run build-583:external-institutional-acceptance
```

Reports execution tiers separately:

| Tier | Meaning |
|------|---------|
| `local_automated` | Vitest unit/component tests only |
| `simulated_sandbox_provisioning` | In-memory admin provisioning (not customer-facing) |
| `disposable_postgresql` | Build #582 institutional trust proof when disposable DB env is authorized |
| `real_authenticated_http_sandbox` | Live `POST /api/launchpad/auth/session` (+ optional integration-health GET) |
| `authenticated_browser` | Requires artifact file `artifacts/build583-authenticated-browser-acceptance.json` with `ok: true` and `routes_tested[]` from a real browser walkthrough |
| `external_customer_executed` | Blocked until a third party runs the handoff outside Abraxas CI |

Environment variables alone do not complete browser or external-customer tiers. Missing partner credentials and sessions remain explicit **blocked** states.
