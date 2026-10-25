# Design partner pilot — founder runbook (internal)

**Status:** PR #828 merged. External partner **not** yet onboarded.

## Merge confirmation

- **PR:** [#828](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/828) merged to `main`
- **Handoff package:** `docs/integration/design-partner/`
- **Partner first link to send:** [`docs/integration/design-partner/START_HERE.md`](../integration/design-partner/START_HERE.md) → copy [`examples/external-node-partner/`](../../examples/external-node-partner/) (HTTP only; no `@/lib`)

## Verified sandbox URLs (2026-10-25)

| Surface | URL |
|---------|-----|
| Demo Integration Studio | https://demo.abraxasworld.xyz/developers/integration-studio |
| Demo Partner Flow entry | https://demo.abraxasworld.xyz/partner/verify |
| Demo portable export pattern | `GET https://demo.abraxasworld.xyz/api/receipts/{receipt_id}/portable-verification` |
| Production Integration Studio | https://abraxasworld.xyz/developers/integration-studio (separate DB — do not mix with Demo pilot) |

Portable export **live** on Demo for reference receipt `dr_jSXuDfM_pFMT36du`. Production portable for that id: **404** (expected).

## Readiness to invite

| Item | Ready? |
|------|--------|
| Documentation + 20 automated integration tests | Yes |
| Unified Demo environment guide | Yes (`SANDBOX_ENVIRONMENT.md`) |
| Single first-action quickstart | Yes (`START_HERE.md`) |
| External developer completed pilot | **No** — pending invite |
| Dedicated partner sandbox app + key | **Founder action** |

## Founder provisioning checklist (secure)

1. Confirm pilot uses **Demo end-to-end** ([SANDBOX_ENVIRONMENT.md](../integration/design-partner/SANDBOX_ENVIRONMENT.md)).
2. Create or designate **wallet-control** sandbox application on **Demo** Integration Studio.
3. Allowlist partner **exact** HTTPS callback URL(s).
4. Deliver via **secure channel** (one message bundle):
   - `abx_test_…` API key (show once)
   - `partner_id`, `policy_id`, `application_id`, `binding_id` if applicable
   - `ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz`
5. Deliver **out-of-band** Demo trust anchor JSON + fingerprint ([TRUST_ANCHOR.md](../integration/design-partner/TRUST_ANCHOR.md)); public template fingerprint `de6e0d6c…ce047`.
6. Ask partner to run **START_HERE** Step 2; support only on blockers (export 503, allowlist, env mismatch).
7. Record in [PILOT_ACCEPTANCE_CHECKLIST.md](../integration/design-partner/PILOT_ACCEPTANCE_CHECKLIST.md): setup time, errors, operator assists.

## Measurable acceptance (partner must demonstrate)

1. Authorized verification request created.
2. Holder flow with valid consent.
3. Genuine signed decision received.
4. Issuer authority authenticated independently.
5. Signed status + policy binding verified.
6. Access decision enforced in **their** app.
7. Safe behavior when status stale / export unavailable.

## Blocked / ops-dependent requirements

- **Portable export 503** — Demo Vercel env must include issuer export/signing vars; promote deployment to Demo custom environment after merges ([BUILD_824](../integration/BUILD_824_LIVE_DEMO_PORTABLE_EXPORT.md)).
- **PartnerKit not on npm** — partner vendors from repo or copies patterns; state explicitly in invite.
- **No fake activity** — do not simulate partner completion in metrics.

## Recommended invite framing

Ask one developer with a real **wallet-control gate** to integrate a single verification check and report what breaks — not a conceptual evaluation of Abraxas.
