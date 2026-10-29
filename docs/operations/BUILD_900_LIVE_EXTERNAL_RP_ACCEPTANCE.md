# Build 900 — Live external relying-party acceptance

**Build 899 baseline:** merged at `2062e502` (PR #899).  
**Evidence class:** deployed Demo sandbox + engineering-operated `examples/external-node-partner` (reference run, not unaided customer adoption).

## Founder objective

Execute a real partner handoff and signed receipt on deployed sandbox infrastructure, enforce **permit · deny · indeterminate** in a **separate Node process** (not Abraxas hosted UI as the relying party), and validate **Check my application** read-only integration state with Build 899 completion gates.

## Executed commands

```bash
# Unit + fixture evidence (repo root)
./node_modules/.bin/vitest run \
  lib/developers/builderEnforcementCorrelation.test.ts \
  lib/developers/builderExternalIntegrationAcceptance.test.ts \
  examples/external-node-partner/externalPartner.test.ts

# Live Demo sandbox (requires LAUNCHPAD_* env + BUILD900_LIVE_ACCEPTANCE=1)
BUILD900_LIVE_ACCEPTANCE=1 LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz \
  npm run build900:live-external-rp-acceptance
```

## Deployed environment

| Field | Value |
| --- | --- |
| Demo base | `https://demo.abraxasworld.xyz` |
| Deployment commit (staging probe) | `2062e5025639bc6b6316344ae4b547a7a4b5b189` |
| Supabase ref | `ocntwbxarpjeixdnzide` (redacted in artifacts) |
| External integration | `examples/external-node-partner` |

## Permit and deny enforcement (external process)

Live run artifact: `/opt/cursor/artifacts/build-900/live-external-rp-acceptance.json`

| Outcome | External verifier action | Notes |
| --- | --- | --- |
| **Permit** | `permit` | Authentic receipt, bound partner + policy, `currently_acceptable: yes` |
| **Deny (wrong partner)** | `deny` | `audience_mismatch`, `status_partner_mismatch` |
| **Deny (forged policy)** | `deny` | `audience_mismatch`, `status_policy_mismatch` |
| **Indeterminate** | `indeterminate` | Tampered trust-anchor fingerprint (`anchor_fingerprint_mismatch`) |

Independent verification uses pinned trust anchor + portable HTTP export — same contract as an external relying party.

## Homepage / Check my application

Read-only API: `GET /api/developers/integration-studio/external-integration-state?application_id=…&harness_ok=1`

**Before Build 900 correlation fix (deployed Demo @899):** phase stalled at `independent_verification_passed` with `verified_permit: false` despite partner telemetry — handoff lifecycle events were stored on `request_id` without `receipt_id`, so receipt-scoped correlation dropped the request origin.

**Fix (this build):** `lib/developers/builderEnforcementCorrelation.ts` merges request-scoped lifecycle events into receipt groups before chain evaluation. Re-run live acceptance after this change deploys to Demo.

Full API snapshots:  
`/opt/cursor/artifacts/build-900/external-integration-state-before.json`  
`/opt/cursor/artifacts/build-900/external-integration-state-after.json`

## Event provenance

- Partner telemetry posted via authenticated `POST /api/v1/integration-verification/report` (API key + `x-abraxas-application-id`).
- Spoofed `dr_harness_*` receipt accepted as telemetry but excluded from completion correlation (`isHarnessReceiptId`).
- Distinction preserved: `partner_reported` vs `platform_independently_verified` (Build 899).

## Security boundaries (reviewer checklist)

| Control | Status |
| --- | --- |
| Authenticated event origin (API key scoped to application) | Demonstrated on live Demo |
| Receipt re-verification before completion headline | Required by #899 route (platform verify) |
| Harness / fixture receipt exclusion | Demonstrated |
| Correlation not solely partner-declared receipt id | **Fixed:** request-scoped handoff merged into receipt chain |
| External backend execution proof | **Open** — reference app only; not third-party audited enforcement |

## Scorecard recommendation

| Dimension | Score | Notes |
| --- | ---: | --- |
| Product experience | **7/10** | Unchanged — deployed founder journey still pending full completion UX on Demo after correlation deploy |
| Integration reliability evidence | **↑ material** | Live permit/deny/indeterminate in external Node + authentic receipt on Demo |
| Production / institutional acceptance | **Open** | No production handoff; reference integration operated by engineering |
| Next commercial milestone | — | External developer integrates without assistance and reproduces permit + deny |

**Trust is continuous. Enforcement is demonstrable in the reference external process; homepage completion requires deploying Build 900 correlation fix and confirming platform receipt re-verification on Demo.**

## Remaining dependencies

1. Deploy Build 900 correlation fix to Demo and re-run `npm run build900:live-external-rp-acceptance` until `homepage_completion_ok: true`.
2. Optional: second receipt path for `verified_deny` chip (platform verify of a legit receipt remains `permit` under bound policy — deny UX may stay partner-reported + external demo).
3. Unaided external developer adoption (873/876 kit) — out of scope for this reference run.
