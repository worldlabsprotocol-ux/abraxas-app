# Build 873 — Integration adoption and institutional readiness

## Scorecard intent

Eliminates a specific 9/10 blocker: **external developers cannot see how their own application consumes Abraxas** after sandbox provisioning.

| Workstream | Prior | This build | Evidence required to raise score |
| --- | --- | --- | --- |
| Institutional adoption | 2/10 | Integration destination surfaced in Studio + reference path documented | Live third-party app completes handoff without founder (not claimed here) |
| Product experience | 5/10 | Unchanged UI scope beyond Studio adoption panel (872 handles journey) | Founder testing on 872 |
| Security / operations | 6/10 | Build 870 preserved; adoption security audit matrix | Independent review + drills (874) |
| Commercial readiness | 1/10 | Metering audit summarized; no new billing product | Paid pilot instrumentation (875) |

## Shortest supported path (audited)

| # | Step | Existing surface |
| --- | --- | --- |
| 1 | Sandbox application + callback | Integration Studio create · Launchpad API |
| 2 | Server-side API key | One-time provision response |
| 3 | Policy / partner binding | Application policy pin |
| 4 | `POST /api/v1/partner-handoff` | Hosted handoff HTTP API |
| 5 | Holder wallet (when policy requires) | Hosted verify UI |
| 6 | Callback / return URL | `allowed_return_urls` |
| 7 | Portable bundle fetch | Partner handoff ref + export routes |
| 8 | Independent verify | `@abraxas/independent-verifier` |
| 9 | Application enforcement | `enforceIndependent` / external-node `enforce.ts` |
| 10 | Production gate | Launchpad production review |

**Gaps found (actual, not assumed new API):**

- Developer Workspace wallet demo was easy to confuse with partner integration → explicit gap detection + copy
- Default callback did not match copy-ready reference → wallet_control handoff pre-fills `http://127.0.0.1:3847/callback`
- Studio lacked a single “external application integration” checklist → `IntegrationAdoptionReadinessPanel`
- No repeatable adoption acceptance artifact → `build873:integration-adoption-acceptance`

## Reference integration (reused)

**`examples/external-node-partner/`** — copy-ready Node server:

- Server-side handoff creation
- Callback parsing
- Portable bundle verify + enforcement (Build 870-aligned test for `statement_stale`)

No new SDK or protocol layer.

## Security / operations (Build 873 audit)

See `lib/partner/universalIntegration/integrationAdoptionSecurityAudit.ts` — each control tagged **tested_in_ci**, **implemented_unverified**, **operational_dependency**, or **gap**.

Build **870 mandatory freshness** enforced on reference `enforce.ts` path (vitest).

## Commercial readiness (analysis only)

`auditCommercialMeteringCapabilities()` findings:

- **Implemented:** partner API usage rows, receipt metering idempotency, API call dedup keys, tenant attribution
- **Partial:** harness exclusion from pilot metrics (operator discipline)
- **Unverified / missing for paid pilots:** billing reconciliation export job, invoice ETL

**Smallest path to paid institutional pilot:** use existing `partner_metering_events` + `partner_api_usage` with external ETL and a single sandbox→production upgrade contract — no new billing stack in this build.

## Measurable adoption evidence

Run:

```bash
npm run test:build-873-integration-adoption
npm run build873:integration-adoption-acceptance
```

Artifact: `/opt/cursor/artifacts/build-873/integration-adoption-acceptance.json`

Live metrics (time to first verification, time to independent receipt) are **null until a deployed sandbox run** — not fabricated.

## Coordination with Build 872

- 872: unified workspace journey (parallel founder testing)
- 873: Studio + reference integration adoption (this PR)
- UI overlap limited to Integration Studio configuration stage panel

## Remaining dependencies

- Merge **872** before or with **873** for consistent handoff URLs
- Deployed Demo run of external-node-partner against real sandbox credentials
- Build **874** for operational drills; **875** for commercial pilot packaging
