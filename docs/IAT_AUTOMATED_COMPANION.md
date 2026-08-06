# Automated IAT companion

Read-only production checks that support Institutional Acceptance Test (IAT) execution. **Does not claim full IAT completion.**

## Command

```bash
IAT_BASE_URL=https://abraxasworld.xyz npm run iat:automated
```

Optional:

```bash
IAT_REPORT_DIR=reports/iat-automated   # default
```

## What it automates (read-only)

| Check | Description |
|-------|-------------|
| Compatibility manifest | `GET /api/protocol/compatibility` vs frozen contract |
| Canonical origin | Base URL is `https://abraxasworld.xyz` |
| Good Trouble pilot URLs | Verify URL shape + checkout button |
| Public routes | `/`, `/passport`, `/partner/verify`, `/good-trouble/enter`, `/docs/partner-flow` |
| Trust signing | `GET /api/trust/status` → `signing_configured` |
| Integration preflight | Aggregated `runIntegrationPreflight` |
| Receipt validation contract | Offline fail-closed fixtures |
| No stale Vercel host | Response bodies scanned |
| Audit trace readiness | `npm run audit:partner-flow-trace` command + migration 054 |

## What requires a human

Scenario A (and B–D) browser flows are labeled **HUMAN_REQUIRED** in every report. The runner never:

- Creates verification requests
- Signs in (OAuth / zkLogin)
- Records consent
- Captures identity documents
- Approves users in admin
- Mutates Supabase
- Claims IAT passed

## Reports

Dated Markdown + JSON written to `reports/iat-automated/`:

- `iat-automated-<timestamp>.md`
- `iat-automated-<timestamp>.json`

JSON includes a **Scenario A evidence template** with fields for `verification_request_id`, `flow_trace_id`, `consent`, `approval`, `residency_country`, `decision_id`, `receipt_id`, `signature_valid`, `callback`, and `audit_rows`.

## Related docs

- `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` — human IAT execution
- `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` — sign-off results
- `docs/BETA_GATE_EVIDENCE.md` — gate matrix
