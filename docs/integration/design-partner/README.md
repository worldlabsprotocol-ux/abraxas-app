# External design partner — canonical sandbox integration

**Build #828 entry point.** One route for the first external design-partner pilot. Do not add parallel SDKs or dashboards here.

## First action

**External developers:** [`START_HERE.md`](./START_HERE.md) → copy [`examples/external-node-partner/`](../../../examples/external-node-partner/) (HTTP + verifier only, no `@/lib`).

**Monorepo / Abraxas app consumers:** [VERIFY_WITH_ABRAXAS_QUICKSTART.md](../../VERIFY_WITH_ABRAXAS_QUICKSTART.md) (Partner Kit).

**Environment:** read [`SANDBOX_ENVIRONMENT.md`](./SANDBOX_ENVIRONMENT.md) once so Demo and Production are not mixed.

## Choose your path

| Phase | What you do | Abraxas backend at enforce time? |
|-------|-------------|----------------------------------|
| **A. Issuance (Days 1–5)** | Hosted Partner Flow + Partner Kit callback verify | Yes — HTTP for request, callback, optional online receipt check |
| **B. Independent verify (Days 6–14)** | Portable export + `@abraxas/independent-verifier` + checkpoints | **No** — one HTTPS fetch for bundle, then offline |

**Recommended narrow pilot:** wallet-control or age-21 **sandbox** policy — not full institutional IDV.

## Package contents

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | End-to-end steps (enrollment → enforce) |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Required env vars (no secrets in git) |
| [TRUST_ANCHOR.md](./TRUST_ANCHOR.md) | Out-of-band anchor / registry install |
| [SANDBOX_TEST_CASES.md](./SANDBOX_TEST_CASES.md) | Expected permit / deny / indeterminate |
| [ERRORS_AND_RECOVERY.md](./ERRORS_AND_RECOVERY.md) | Failure codes and safe next actions |
| [SECURITY_RESPONSIBILITIES.md](./SECURITY_RESPONSIBILITIES.md) | Partner vs Abraxas |
| [PILOT_ACCEPTANCE_CHECKLIST.md](./PILOT_ACCEPTANCE_CHECKLIST.md) | 14-day pilot exit criteria |

## Code references (in-repo)

| Artifact | Path |
|----------|------|
| Hosted handoff + durable `vr_*` | [VERIFY_WITH_ABRAXAS_QUICKSTART.md](../../VERIFY_WITH_ABRAXAS_QUICKSTART.md) |
| Multi-instance Partner Kit example | [examples/verify-with-abraxas-external/](../../../examples/verify-with-abraxas-external/) |
| **Standalone verify (no `@/lib`)** | [examples/portable-relying-party/](../../../examples/portable-relying-party/) |
| Trust continuity (checkpoints + registry) | [BUILD_827_PARTNER_TRUST_CONTINUITY.md](../BUILD_827_PARTNER_TRUST_CONTINUITY.md) |
| Integration Studio (sandbox app) | `https://abraxasworld.xyz/developers/integration-studio` |
| Public portable export | `GET https://abraxasworld.xyz/api/receipts/{receipt_id}/portable-verification` |
| Demo portable export (when enabled) | `GET https://demo.abraxasworld.xyz/api/receipts/{receipt_id}/portable-verification` |

## Public API boundaries

From Partner Flow integrator kit (`PARTNER_FLOW_AUTH_BOUNDARY`):

- **Browser session:** hosted `/partner/verify`, evaluate/complete (holder only).
- **Server API key:** verification request creation, authenticated partner APIs.
- **Public (no auth):** `GET /api/receipts/{id}/public`, `GET /api/receipts/{id}/portable-verification`, verification keys.

Callback query parameters are **never** authorization.

## Validate locally (no external partner claimed)

```bash
npm run test:build-828-design-partner-readiness
```

This proves verifier-only independence on synthetic fixtures. Live sandbox success still requires founder-issued sandbox credentials and holder authorization.
