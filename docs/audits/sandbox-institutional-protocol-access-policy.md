# Reviewed sandbox institutional protocol-access policy

**Scope:** Source-controlled sandbox-only Launchpad policy for institutional protocol access.  
**Independent review:** `bc-9c1f7ff3-4a0a-578c-bf2f-747789ef330a`  
**Verdict:** CLOSED — 0 Critical / 0 High / 0 Medium / 0 Low  
**This document does not deploy, broadcast, configure RPCs, add keys, apply SQL, or move funds.**

## Pin

- Policy ID: `sandbox_institutional_protocol_access`
- Version: `1`
- Action: `activate_protocol_access`
- Scope: `sandbox:protocol_access`
- Issuer: `abraxas.organization_eligibility` (privacy-preserving, L2, sandbox-only)
- Result category: `organization_eligible` (migration 106)

## Controls

| Area | Result |
|---|---|
| Production | Denied at Launchpad create, Partner Flow, attestation bind, and production-review `sandbox_only_policy` |
| Browser authority | Create route rejects `policy_id`, `policy_version`, `issuer`, `assurance`, `signer`, `network`, `receipt_id`, `organization_result` |
| Method qualification | Only privacy-preserving qualifies; reuse, partner-age, self-attestation, identity/liveness, and account login do not |
| Org reuse | Maps reviewed policy onto existing `organization_eligible` records; no new company DB or live issuer |
| Fixtures | No new operator KYB fixture; no fake issuer |
| Privacy | Public view remains result, expiry, validity, audience/policy/action binding, opaque refs |

## Residual

- Partner Flow UI action label `institutional_protocol_access` is configuration-only; attestation uses `activate_protocol_access`.
- Integration Studio structured policy-fit does not offer this reviewed pack (Launchpad-only).

## Links

- PR: https://github.com/worldlabsprotocol-ux/abraxas-app/pull/374
- Migration (existing, not applied here): `supabase/migrations/106_private_organization_eligibility.sql`
- DEMO SQL editor: https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide/sql/new
