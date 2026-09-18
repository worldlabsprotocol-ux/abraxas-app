# Partner Sandbox and Integration Readiness Gate

Partners configure an integration, pin a policy pack/version, run TEST-only sandbox checks, and receive a **server-derived** readiness result that names the exact blocker. This is reusable platform infrastructure. It is not a vertical app, marketplace, wallet, KYC flow, or review queue.

**Status:** Code is in this PR. No new database migration. Evidence is stored in existing `partner_launchpad_activity` rows (`event_type = sandbox_readiness_run`) plus current Launchpad, webhook, DNS, key, and Policy Change Control tables.

Do not apply anything to MAIN / Production Supabase. Do not merge this PR to enable production activation.

---

## What is real vs fixture

| Surface | Classification |
|---|---|
| Policy pin, callback allowlist, DNS TXT, scoped sandbox key | **Real** configuration |
| Harness receipt evaluation (`evaluatePublicReceiptTrust`) | **Real** verification of labeled sandbox receipts |
| Webhook TEST EVENT enqueue | **Real** outbox enqueue; delivery is best-effort, not authorization |
| HMAC check inside the webhook stage | **Fixture** signing secret `abx_whsec_sandbox_readiness_fixture` — never a live secret |
| Unsigned / wrong-version probes | **In-process fail-closed fixtures** |
| Sandbox manifest | **Server-derived artifact**, no secrets or PII |
| Production activation | **Not performed** by this feature |

---

## Required stages

1. `policy_configured`
2. `callback_allowlisted`
3. `server_receipt_verification`
4. `fail_closed` (denied, expired, revoked, unsigned, wrong-partner, wrong-policy, wrong-version)
5. `webhook_test` (labeled TEST EVENT + HMAC fixture)
6. `policy_version_compatibility` (explicit adoption / PCC)

Every stage reports `pass`, `fail`, `blocked`, or `not_run` with a precise safe code.

A sandbox pass is **never** production authorization. `sandbox_pass_is_not_production_authorization` is always true. Production remains gated by the existing `/production-access` safety checks.

---

## Routes

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/launchpad/applications/:id/sandbox-readiness` | Server plan, score, blockers, last run, next action, downloadable manifest |
| `POST` | same | Run one stage. Tenant + IP rate limited. Idempotent when `idempotency_key` is repeated |

Never issues a production receipt, never reveals secrets, never authorizes from callback query parameters.

---

## Manifest

Machine-readable JSON: integration id, policy id/version, verified callback host, webhook status, supported receipt outcomes, readiness state.

Validate offline:

```bash
npm run partner:conformance
```

The harness now includes sandbox-manifest checks (`sandbox-manifest-offline`, `sandbox-manifest-rejects-secrets`, `sandbox-manifest-not-production-auth`).

---

## Data

No new SQL. Reuse:

- `partner_launchpad_applications` (084)
- `partner_launchpad_activity` (084)
- `partner_launchpad_domain_verifications` (087)
- webhook config/outbox (062–069)
- Policy Change Control (088, DEMO-only; missing schema reports `policy_schema_unavailable`)

If an operator later wants a dedicated runs table, add a DEMO-only idempotent migration and a schema probe. That is **not** required for this PR.

DEMO project (read-only unless a later DEMO-only migration is explicitly requested): https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide

Never use MAIN / Production `bztwutzprwsdrtqdpymf`.
