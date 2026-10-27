# Institutional pilot activation kit (Build 876)

**Purpose:** Minimum material for an **independently operated** application to enforce a **policy-bound trust decision** on Demo — not a wallet-connect demo.

Parallel tracks: **873** (integration), **874** (security ops), **875** (commercial validation when merged). This kit adds **activation**, not new protocol surfaces.

## Pilot value proposition (sell this)

> Your authorization layer can enforce **current, independently verifiable** trust outcomes bound to **your policy and partner audience** — without treating Abraxas hosted UI as the enforcement point.

See [WALLET_VS_TRUST_DECISION.md](../../../examples/external-node-partner/WALLET_VS_TRUST_DECISION.md).

## Scope (first paid pilot)

| In scope | Out of scope |
| --- | --- |
| Demo sandbox application + allowlisted callback | Production promotion without Launchpad review |
| Wallet-control **policy template** as qualification path | New custom policies or regulatory eligibility claims |
| Portable verify + enforce in **integrator** runtime | Abraxas implementing partner app code |
| Permit / deny / indeterminate enforcement proof | SLA or latency guarantees |

Full pilot acceptance aligns with [PILOT_ACCEPTANCE_CHECKLIST.md](../design-partner/PILOT_ACCEPTANCE_CHECKLIST.md).

## Founder secure handoff (minimum)

Deliver in **one secure bundle** (never public chat):

1. `abx_test_…` API key (one-time display)
2. `application_id`, `partner_id`, `policy_id`, optional `binding_id`
3. `ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz`
4. Allowlisted **HTTPS** callback URL(s)
5. Trust anchor JSON + fingerprint ([TRUST_ANCHOR.md](../design-partner/TRUST_ANCHOR.md))
6. Verifier `abraxas-independent-verifier-0.1.1.tgz` + SHA-256 ([vendor/README.md](../../../examples/external-node-partner/vendor/README.md))
7. Link to this kit + [ADOPTION_RUNBOOK.md](../../../examples/external-node-partner/ADOPTION_RUNBOOK.md)

Code checklist (repo): `EXTERNAL_DEVELOPER_HANDOFF_MINIMUM` in `lib/commercial/pilotActivation/externalDeveloperAcceptance.ts`.

## Integrator executable path

1. Copy `examples/external-node-partner/` only (no `@/lib`).
2. Configure `.env` from handoff.
3. `npm install && npm start`
4. Create handoff → holder flow → callback → portable fetch → **local verify + enforce**.

Automated **internal** Demo run (`BUILD873_DEMO_LIVE_ADOPTION=1`) is **reference only** — it does **not** count as unaided adoption.

## Record adoption metrics (outside git)

Copy [EXTERNAL_DEVELOPER_ADOPTION_METRICS.template.json](./EXTERNAL_DEVELOPER_ADOPTION_METRICS.template.json) to founder CRM or secure storage. Fill when a **real external developer** completes integration without Abraxas writing their app.

Required for **unaided** gate: setup time, callback failures, operator interventions, integrator-side permit + deny/indeterminate proof.

Validate structure locally (optional):

```bash
EXTERNAL_DEV_METRICS_JSON=/path/to/filled.json npm run build876:validate-external-developer-metrics
```

## Security (no commercial bypass)

- Build **870** mandatory freshness on enforce path
- Build **874** `simulated_ci` vs `deployed_demo` tiers before Production for regulated buyers
- Production review unchanged

## Commercial discovery

Intro conversation (6–8 questions): [WILLINGNESS_TO_PAY_INTERVIEW_INTRO_v1.md](../../commercial/WILLINGNESS_TO_PAY_INTERVIEW_INTRO_v1.md)  
Full research bank: [WILLINGNESS_TO_PAY_RESEARCH_BANK_v1.md](../../commercial/WILLINGNESS_TO_PAY_RESEARCH_BANK_v1.md)

Do not commit interview notes or PII to the repository.

## Economics

Cost buckets and marginal-cost guidance: `lib/commercial/pilotEconomics/costAttributionModel.ts`  
Do **not** use total cloud bill ÷ receipts as marginal verification cost without subtracting baseline platform.
