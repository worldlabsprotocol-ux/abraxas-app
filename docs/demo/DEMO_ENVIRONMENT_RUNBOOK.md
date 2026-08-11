# Partner Sandbox Demo — Environment Runbook

**Current state:** Phase A supplies **read-only validation only**. It cannot provision, clean up, migrate, or modify a database.

This runbook describes the isolated demo environment at `https://demo.abraxasworld.xyz` (not yet provisioned). Do not apply steps that mutate Production, Supabase, Vercel, Google OAuth, or DNS until explicitly approved.

## Objective

Operate a stable presenter environment that:

- Uses a **separate Supabase demo project** (recommended) or branch
- Deploys via **Vercel Custom Environment** or dedicated Preview with stable domain
- Uses **synthetic identity data only**
- Reuses existing Abraxas policy, receipt, validation, metering, and webhook **code paths**
- Creates **no Production database records**

## Architecture

```
demo.abraxasworld.xyz  →  Vercel demo environment
        │
        ▼
Isolated Supabase project
  ├── Migrations (see demoMigrationManifest.ts)
  ├── abraxas-partner-sandbox / partner-sandbox-gate-v1
  └── Synthetic holder (Phase B provisioner — not yet implemented)
```

Production (`abraxasworld.xyz`) remains isolated: separate project ref, secrets, cookies, and signing keys. The production Supabase project reference is a **non-secret deployment identifier** committed in `scripts/demo/lib/knownProductionSupabaseProjectRefs.ts`. Changing production Supabase projects requires a **reviewed repository update** to that immutable denylist.

## Phase A — Read-only validation

The validator remains intentionally unusable until **both** `DEMO_SUPABASE_PROJECT_REF` and `PRODUCTION_SUPABASE_PROJECT_REF` are configured correctly against the immutable denylist.

### Prerequisites

Set in `.env.demo.local` (never commit — covered by `.env*.local` and explicit `.env.demo.local` gitignore entry):

```bash
DEMO_SUPABASE_PROJECT_REF=<demo-project-ref>
PRODUCTION_SUPABASE_PROJECT_REF=bztwutzprwsdrtqdpymf
# Optional extra denylist:
# DEMO_DENIED_SUPABASE_PROJECT_REFS=<ref-a>,<ref-b>
NEXT_PUBLIC_SUPABASE_URL=https://<demo-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<demo-service-role-key>
# Optional until Phase B:
PARTNER_SANDBOX_DEMO_SUBJECT_ID=0x...
```

`PRODUCTION_SUPABASE_PROJECT_REF` must match `scripts/demo/lib/knownProductionSupabaseProjectRefs.ts`. The immutable denylist cannot be overridden or removed through environment variables.

### Run validation

```bash
DOTENV_CONFIG_PATH=.env.demo.local npm run demo:validate
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Ready — required schema and sandbox seeds present |
| 1 | Missing or incorrect database requirements |
| 2 | Unsafe or invalid configuration (ref mismatch, invalid subject, etc.) |

## Canonical migration manifest

A fresh Supabase project requires **more than migrations 018 onward**. The dependency-ordered manifest lives in:

`scripts/demo/lib/demoMigrationManifest.ts`

### Summary (required tier)

| Order | Migration | Creates / seeds |
|------:|-----------|-------------------|
| 1 | `006_abraxas_id.sql` | `identity_verifications`, `abraxas_credentials` |
| 2 | `007_sui_zklogin.sql` | Sui columns on identity tables |
| 3 | `020_identity_verification_state_machine.sql` | IDV state machine columns |
| 4 | `018_policy_verification.sql` | `credential_claims`, `wallet_bindings`, `partner_policies`, verification tables |
| 5 | `019_trust_registry_complete.sql` | `credential_issuers` |
| 6 | `024_partner_api_keys.sql` | `partner_api_keys`, `partner_api_usage` |
| 7 | `025_partners_registry.sql` | `partners` |
| 8 | `032_reconcile_sandbox_and_cielo_operator_workflow.sql` | Sandbox partner + policy seeds |
| 9 | `033_decision_receipts.sql` | `decision_receipts` |
| 10 | `034_credential_status_registry.sql` | Status registry + receipt dependencies |
| 11 | `035_issuer_framework_trust_registry.sql` | `issuer:abraxas-sandbox` seed |
| 12 | `036_connect_wallet_authority.sql` | `wallet_bindings.binding_status` |
| 13 | `053_partner_flow_idempotency.sql` | `verification_decisions.idempotency_key` |
| 14 | `055_policy_immutable_versions.sql` | Policy versioning |
| 15 | `056_publish_partner_policy_draft_rpc.sql` | Publish RPC |
| 16 | `058_partner_metering_foundation.sql` | Metering tables |
| 17 | `062_partner_webhook_outbox.sql` | Webhook outbox (delivery disabled by default) |

**Do not run:** `028`–`031` (superseded by `032`), `018_policy_verification_repair.sql` (destructive).

### Platform prerequisites (fresh Supabase project)

- **PostgreSQL 15+** on Supabase (006 uses `gen_random_uuid()` before 018 installs `pgcrypto`)
- **`pgcrypto`** — installed by `018_policy_verification.sql`; required for later digest/crypto helpers
- **`uuid-ossp`** — only required by out-of-scope `001_tokenization_requests.sql`
- **Migrations 001–005** — not required for Partner Sandbox demo runtime paths

Extension catalog verification is **UNVERIFIABLE** via Supabase REST in Phase A; missing extensions must be caught during migration apply or a future read-only RPC. **UNVERIFIABLE** results are not security validation successes.

RLS, `pg_policies`, `pg_indexes`, functions/RPCs, and `information_schema` column catalog checks are also **UNVERIFIABLE** through REST in Phase A.

## Phase B — Future provisioning (not implemented)

The offline provisioner (`scripts/demo/provision-partner-sandbox-holder.ts`) will:

- **Generate** the synthetic subject itself (no `--subject-id` flag)
- Call internal library functions directly (`issueManualIdentityCredential`, `applySandboxScreeningClear`)
- Write state to `scripts/demo/.sandbox-holder.json` (gitignored) with demo project ref + subject
- Refuse cleanup if project ref differs from state file
- Stop if any claim would be production-usable outside sandbox policy scope
- **Not** require Google OAuth, `PILOT_TIER3_SCREENING`, or `/api/credentials/issue`

## Stable domain and OAuth (documentation only)

When the demo environment is created:

| Item | Value |
|------|-------|
| Vercel domain | `demo.abraxasworld.xyz` |
| DNS | `CNAME demo → Vercel` |
| Google OAuth origin | `https://demo.abraxasworld.xyz` |
| zkLogin redirect | `https://demo.abraxasworld.xyz/auth/zklogin/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://demo.abraxasworld.xyz` |
| `ABRAXAS_ISSUER_URL` | `https://demo.abraxasworld.xyz` |

Cookies are host-scoped; demo sessions do not cross to Production.

## Activation sequence (full environment — future)

1. Create isolated Supabase demo project
2. Apply canonical migrations (manifest order)
3. Run `npm run demo:validate` (exit 0)
4. Configure Vercel demo environment variables
5. Attach `demo.abraxasworld.xyz`
6. Configure Google OAuth (demo client)
7. Run Phase B provisioner (when implemented)
8. Set `PARTNER_SANDBOX_DEMO_SUBJECT_ID` + `PARTNER_SANDBOX_DEMO_ENABLED=true`
9. Redeploy demo environment
10. Five-minute rehearsal (`docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md`)
11. Test cleanup + reprovision cycle

## Related docs

- `docs/demo/DEMO_VARIABLE_MATRIX.md`
- `docs/demo/DEMO_SECURITY_CHECKLIST.md`
- `docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md`
- `docs/TIER3_AND_RELYING_PARTNERS.md`
