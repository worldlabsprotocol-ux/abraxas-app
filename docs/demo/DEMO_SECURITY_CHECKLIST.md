# Partner Sandbox Demo — Security Checklist

**Current state:** Phase A validation and Phase C provisioning CLI are available. Phase C.1 cleanup is not implemented.

The validator remains intentionally unusable until both Production and Demo refs are configured correctly. The production project reference (`KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS`) is a non-secret deployment identifier; rotating production Supabase projects requires a reviewed update to that immutable denylist.

## Phase A — Before connecting to a demo database

- [ ] `DEMO_SUPABASE_PROJECT_REF` set to demo project only
- [ ] `PRODUCTION_SUPABASE_PROJECT_REF` set and matches `KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS`
- [ ] `PRODUCTION_SUPABASE_PROJECT_REF` and immutable denylist differ from demo ref
- [ ] `NEXT_PUBLIC_SUPABASE_URL` hostname matches demo ref exactly
- [ ] Demo and Production service-role keys are **not** the same value
- [ ] `.env.demo.local` is gitignored (never commit secrets)
- [ ] Run `DOTENV_CONFIG_PATH=.env.demo.local npm run demo:validate`
- [ ] Validator exits 0 before any Phase B provisioning work

## Isolation guards

| Threat | Control |
|--------|---------|
| Accidentally targeting Production | Immutable `KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS` denylist + `PRODUCTION_SUPABASE_PROJECT_REF` + optional `DEMO_DENIED_SUPABASE_PROJECT_REFS`; URL ref must match demo ref |
| Demo equals Production project | Fail closed (exit 2) |
| Printing secrets in logs | `redactSecrets()` masks known env values; refs/URLs masked |
| Committing secrets | `.env*.local` and `.env.demo.local` gitignored; validator reports under `reports/demo-*` gitignored |
| Static mutation guard | `assertReadOnlyPolicyModules()` scans validator + imported runtime modules (defense in depth only — not a substitute for database permissions) |
| NODE_ENV-only safety | **Not used** as primary boundary — project ref guards instead |
| Catalog claims via REST | RLS, policies, indexes, functions, and extensions reported as **UNVERIFIABLE** in Phase A — not PASS/security successes |

## Database posture

- [ ] Canonical migrations applied per `scripts/demo/lib/demoMigrationManifest.ts`
- [ ] `abraxas-partner-sandbox` status = `sandbox`
- [ ] `partner-sandbox-gate-v1` has `sandbox_only: true`
- [ ] `issuer:abraxas-sandbox` active in `credential_issuers`
- [ ] Webhook delivery **disabled** or no config row for sandbox partner
- [ ] Legacy `006` anon policies reviewed manually (validator reports UNVERIFIABLE for policy catalog)

## Phase C provisioner constraints

The offline provisioner (`npm run demo:provision`) must:

- [ ] Generate subject internally from opaque UUID — **no `--subject-id` option**
- [ ] Use transaction-bound PostgreSQL only for mutations (no PostgREST writes)
- [ ] Write `scripts/demo/.sandbox-holder.json` after DB commit with mode `0600`, atomic rename, symlink rejection, 4 KB max, schema v1, project-ref binding
- [ ] Never store database URL, signing key, or service-role key in env files or state file
- [ ] Require hidden prompt for `DEMO_SUPABASE_DATABASE_URL` and `ABRAXAS_SIGNING_KEY` on apply; unset afterward
- [ ] Live `--apply` disabled until reviewed thumbprint PR merges (`EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` not null)
- [ ] Generate demo signing keys only with `npm run demo:signing-key:generate` outside repository/workspace
- [ ] Verify generated keys with `npm run demo:signing-key:verify` before thumbprint PR
- [ ] Confirm encrypted backup before thumbprint PR (`signing_key_backup_required`)
- [ ] Never commit `demo-signing-*.jwk` or `demo-signing-bootstrap.json`
- [ ] Verify Vercel demo-environment isolation before installing signing keys
- [ ] Never print full subject ID (masked only); `provision_id` may be printed after successful apply
- [ ] `--verify --recover` accepts UUID `provision_id` only
- [ ] Never create real Google accounts, documents, biometrics, email, name, or DOB
- [ ] Never call `/api/credentials/issue` or production issuance PostgREST helpers
- [ ] Require `--apply --confirm <demo-ref>` and refuse `NODE_ENV=production`
- [ ] Never be exposed via a web route
- [ ] Exit 3 on conflicts without mutation — Phase C.1 required for cleanup

## Phase C.1 cleanup (not implemented)

- [ ] Revoke synthetic credential via scoped cleanup command
- [ ] Verify no active claims remain for generated subject
- [ ] Delete local state file after cleanup
- [ ] Re-run `npm run demo:validate` before next rehearsal

## Runtime demo environment

- [ ] `PARTNER_SANDBOX_DEMO_ENABLED=true` on demo only
- [ ] `INTERNAL_API_SECRET` **not set** on demo
- [ ] `PILOT_TIER3_SCREENING` **not required** (provisioner writes sandbox screening directly)
- [ ] Cookies host-scoped to `demo.abraxasworld.xyz`
- [ ] No cross-environment session cookies with Production
- [ ] Webhook delivery disabled or demo-only receiver URL
- [ ] No `RESEND_API_KEY` — demo emails cannot reach real users
