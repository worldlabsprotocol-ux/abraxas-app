# Integration Readiness Reconciliation

**Last updated:** 2026-08-05  
**Baseline:** `main` after PR #115 (external security-review readiness package).  
**Canonical production origin:** `https://abraxasworld.xyz`  
**Status:** Evidence-based reconciliation for users, partners, and competition reviewers. **Not a release sign-off.**

---

## How to read this document

| Status bucket | Meaning |
|---------------|---------|
| **Live today** | Merged to `main`, deployed on abraxasworld.xyz beta — usable with documented limits |
| **Beta-ready — pending human evidence** | Code/tooling exists; operator or pilot evidence not yet signed |
| **Release gates — pending / blocked** | Must **not** be marked complete without signed artifacts |
| **Later / out of scope** | Deferred for this integration cycle |

**Not complete (explicit):** IAT · independent external security review · `v1.0.0-beta.0` tag.

**Good Trouble:** Reference **pilot/sandbox** relying party on hosted checkout (`/good-trouble/*`). Treat as production retail only when operator evidence shows non-sandbox policy + signed pilot agreement — not assumed here.

---

## What Abraxas can do today (live)

Evidence: merged PRs #113–#115, `lib/partner/partnerFlowIntegratorKit.ts`, `public/openapi/partner-flow.openapi.yaml`, targeted Vitest suites.

| Capability | Evidence |
|------------|----------|
| **Partner Flow integration kit** | `lib/partner/partnerFlowIntegratorKit.ts`, `/docs/partner-flow`, `examples/partner-flow-web-rp/` |
| **OpenAPI contract** | `public/openapi/partner-flow.openapi.yaml`, `/docs/partner-flow-api`, `lib/partner/partnerFlowOpenApi.test.ts` |
| **Canonical abraxasworld.xyz paths** | OpenAPI `servers[0].url`, `lib/siteUrl.ts` (`SITE_URL`), integrator kit tests |
| **Good Trouble hosted pilot checkout** | `lib/goodTrouble/partnerIntegration.ts`, `/good-trouble/enter`, retail wiring tests |
| **Fail-closed return URLs** | `lib/connect/returnUrlAllowlist.ts`, enforced on evaluate/complete/refresh routes |
| **Receipt validation (public + partner)** | `GET /api/receipts/{id}/public`, `lib/partner/verifyPartnerFlowReceipt.ts` |
| **P1-2 decision validity + idempotency** | PR #113 — `lib/decisionReceipts/trustEvaluation.ts`, `lib/partner/partnerFlowIdempotency.ts`, migration 053 |
| **P1-3 audit traceability** | PR #114 — `lib/partner/partnerFlowAuditContract.ts`, `lib/partner/partnerFlowTraceAudit.ts`, migration 054 |
| **Integration preflight** | `npm run integration:preflight`, `docs/INTEGRATION_PREFLIGHT.md` |
| **External security-review package** | PR #115 — `docs/external-security-review/` (readiness only — **no review performed**) |
| **Holder auth** | zkLogin JWKS verify + browser session cookie on partner-flow routes |

---

## Beta-ready — pending human evidence

| Item | Why pending | Verification |
|------|-------------|----------------|
| Production IAT (scenarios A–D) | Checklist exists; `PRODUCTION_WALKTHROUGH_RESULTS.md` unsigned | Human execution on abraxasworld.xyz |
| Good Trouble live pilot traffic | UI + APIs wired; sandbox/pilot policy not proven production retail | Operator policy row + pilot agreement |
| Trace audit on real flows | CLI + analyzer merged; no signed operator run attached | `npm run audit:partner-flow-trace -- ft_vr_<id>` |
| Refresh replacement on expired receipt | Code + tests; live expiry cycle not documented | IAT scenario C + trace audit |
| Second relying party | Reference integration pattern only | New partner row + allowlist + pilot |

---

## Release gates — pending / blocked

Do **not** mark these complete in public materials:

| Gate | Status | Artifact |
|------|--------|----------|
| Institutional Acceptance Test | **NOT complete** | `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` |
| External security review | **NOT complete** | Independent report (see `docs/external-security-review/`) |
| `v1.0.0-beta.0` tag | **NOT created** | Git tag |
| Protocol compatibility freeze | **Pending** | `docs/PROTOCOL_COMPATIBILITY.md` |
| Release decision | **Draft** | `docs/RELEASE_DECISION.md` |
| P1-1 immutable policies | **Code merged** — apply `055_policy_immutable_versions.sql` | `docs/POLICY_VERSION_OPERATOR.md` |

See also: `docs/BETA_GATE_EVIDENCE.md`, `docs/ENGINEERING_ROADMAP.md`.

---

## Later / out of scope (current cycle)

- Sui Move passport **mainnet** deployment
- MoonPay / fiat production ramps
- Self-serve partner provisioning dashboard
- Edge rate limiting (deployment-specific)
- P1-4 durable biometric telemetry store
- General availability (GA) claims

---

## How another protocol integrates

1. **Integrator guide** — [https://abraxasworld.xyz/docs/partner-flow](https://abraxasworld.xyz/docs/partner-flow)  
   Sequence, browser session, callback parameters, fail-closed return URLs.

2. **Partner Flow API (OpenAPI docs)** — [https://abraxasworld.xyz/docs/partner-flow-api](https://abraxasworld.xyz/docs/partner-flow-api)  
   Human-readable contract for `/api/v1/partner-flow/*` and receipt verification.

3. **OpenAPI YAML** — [https://abraxasworld.xyz/openapi/partner-flow.openapi.yaml](https://abraxasworld.xyz/openapi/partner-flow.openapi.yaml)  
   Canonical server `https://abraxasworld.xyz` for codegen and CI.

4. **Onboarding checklist** — [`docs/PARTNER_ONBOARDING_CHECKLIST.md`](./PARTNER_ONBOARDING_CHECKLIST.md)  
   Operator steps: partner row, policy, `allowed_return_urls`, API keys, pilot validation.

**Reference example:** `examples/partner-flow-web-rp/README.md`

---

## Integration wiring checklist

*Operator + integrator work required before calling a partner “wired.” Separate from release gates below.*

| # | Item | Owner |
|---|------|-------|
| 1 | Partner row in production `partners` table | Operator |
| 2 | Active `partner_policies` row for `partner_id` | Operator |
| 3 | `allowed_return_urls` includes exact callback URLs (fail-closed) | Operator |
| 4 | `ABRAXAS_ISSUER_URL` + JWKS issuer = `https://abraxasworld.xyz` | Operator |
| 5 | `/api/trust/status` → `signing_configured: true` | Operator |
| 6 | `ABRAXAS_BROWSER_SESSION_SECRET` set for holder routes | Operator |
| 7 | Migrations **053** (idempotency) and **054** (audit index) applied | Operator |
| 8 | Partner site links to `/partner/verify?...&return_url=...` | Integrator |
| 9 | Partner backend verifies `receipt_id` from callback | Integrator |
| 10 | `npm run integration:preflight` PASS (prod URL + read-only Supabase) | Engineering |

### When is integration wiring complete?

All of the following must be true (release gates may still be open):

1. Every row in the wiring checklist above is verified with evidence (preflight PASS, screenshots, or signed operator memo).
2. Pilot E2E exercised: **evaluate → (passport if needed) → complete or refresh → partner callback** with `receipt_id`.
3. `GET /api/receipts/{id}/public` returns `signature_valid: true` for a receipt from that flow on production.
4. Non-allowlisted `return_url` is rejected on partner-flow routes (documented probe).
5. No stale `abraxas-app.vercel.app` issuer or redirect on the partner’s **live** callback path.

---

## Release gates checklist (distinct from wiring)

| Gate | Complete? |
|------|-----------|
| IAT signed | **No** |
| External security review | **No** |
| `v1.0.0-beta.0` tag | **No** |
| `PROTOCOL_COMPATIBILITY.md` signed | **No** |
| `RELEASE_DECISION.md` signed | **No** |

---

## Read-only audit: stale origins and external-facing gaps

*Documentation PR only — findings reported for follow-up; not fixed in this PR.*

| Area | Finding | Risk | Suggested follow-up |
|------|---------|------|---------------------|
| `README.md` | Still points live URL to `abraxas-app.vercel.app` | Reviewer confusion | Update README canonical URL (this PR) |
| `scripts/production-readiness-audit.ts` | Default `AUDIT_BASE_URL` = vercel.app; sample return_url uses stale host | Misleading prod probes | Default to abraxasworld.xyz |
| `package.json` `cielo:e2e:remote` | BASE_URL defaults to vercel.app | Stale remote E2E | Document or default to canonical host |
| `vercel.json` | Alias retains `abraxas-app.vercel.app` | Dual-host redirects / issuer drift | Expected alias; ensure `ABRAXAS_ISSUER_URL` on canonical host |
| `lib/goodTrouble/retailEligibility.ts` | Example fetch URLs use vercel.app | Copy-paste integrator hazard | Update examples to abraxasworld.xyz |
| `lib/protocolIntegrations.ts` | Code samples hardcode vercel.app | Docs drift | Update samples |
| `components/SiteFooter.tsx` | Footer link to vercel.app | User-facing stale origin | Point to abraxasworld.xyz |
| `app/api/credentials/me/route.ts`, `lib/idv/issueIdentityCredential.ts`, `lib/credentials/verifyJwt.ts` | Fallback issuer `abraxas-app.vercel.app` if env unset | Wrong issuer in JWTs | Enforce `ABRAXAS_ISSUER_URL` in production |
| `lib/walletPass/config.ts`, `lib/walletAuthority/*` | `NEXT_PUBLIC_APP_URL` fallback vercel.app | Wallet bind / pass URLs on wrong host | Set `NEXT_PUBLIC_APP_URL` in prod |
| `docs/ZKLOGIN_BACKEND_SETUP.md`, legacy audits | Historical vercel.app URLs | Operator misconfiguration | Add canonical host callout at top |
| `lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts` | Fixture issuer vercel.app | Test-only; documents past default | Align fixture with canonical issuer |
| `components/passport/*`, `lib/protocolContent.ts` | mailto / security contact on vercel.app domain | Operational | Dedicated inbox before GA |

**Canonical-path tests (passing):** `lib/partner/partnerFlowIntegratorKit.test.ts`, `lib/integration/preflight.test.ts`, `lib/partner/partnerFlowOpenApi.test.ts`, `lib/app/publicOriginRouteConsistency.test.ts`.

---

## Reproducible verification

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test -- lib/integrationReadiness.test.ts lib/roadmapPublic.test.ts lib/integration/preflight.test.ts
npm run integration:preflight
```

Production probe (optional):

```bash
INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz \
INTEGRATION_PREFLIGHT_PARTNER_ID=good-trouble-cannabis \
INTEGRATION_PREFLIGHT_POLICY_ID=good-trouble-retail-v1 \
INTEGRATION_PREFLIGHT_RETURN_URL=https://abraxasworld.xyz/good-trouble/enter \
npm run integration:preflight
```

Full command reference: `docs/external-security-review/REPRO_COMMANDS.md`, `docs/INTEGRATION_PREFLIGHT.md`.

---

## Related documents

| Document | Purpose |
|----------|---------|
| `docs/ENGINEERING_ROADMAP.md` | Engineering phase sequence |
| `docs/BETA_GATE_EVIDENCE.md` | Gate evidence matrix |
| `docs/PARTNER_FLOW_INTEGRATION.md` | Good Trouble reference flow |
| `docs/external-security-review/` | External reviewer handoff |
| `lib/integrationReadiness.ts` | Machine-readable status (roadmap + tests) |
