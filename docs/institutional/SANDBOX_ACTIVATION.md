# Institutional sandbox activation (Build #526)

Operator-run procedures for external institutional developers. **Not** production verification.

## 1. Declare sandbox identity

```bash
export INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID=abraxas-demo-sandbox
export INSTITUTIONAL_SANDBOX_ALLOWED_PROJECT_REFS=ocntwbxarpjeixdnzide   # non-production refs only
export INSTITUTIONAL_SANDBOX_BASE_URL=https://your-sandbox-deployment.example
```

## 2. Preflight

```bash
npx tsx scripts/institutional-sandbox-activation-preflight.ts
```

Artifact: `/opt/cursor/artifacts/institutional-sandbox-preflight.json`

Requires live Supabase + signing env for PASS. Missing live deps → **BLOCKED** (not PASS).

## 3. Migration rehearsal (139/140)

**Disposable local (recommended first):**

```bash
bash scripts/institutional-replay-postgres-rehearsal.sh
export INSTITUTIONAL_REPLAY_DISPOSABLE_REHEARSAL_VERDICT=PASS
export INSTITUTIONAL_SANDBOX_DATABASE_URL=postgresql://abraxas524:local_replay_rehearsal_only@localhost:5432/abraxas524_replay
```

**Dry-run gate:**

```bash
export INSTITUTIONAL_MIGRATION_DRY_RUN=1
npx tsx scripts/institutional-replay-migration-rehearsal-gate.ts
```

**Remote sandbox apply (operator only):**

1. Confirm Supabase backup/PITR: `export INSTITUTIONAL_SANDBOX_BACKUP_ACK=acknowledged`
2. Set `INSTITUTIONAL_SANDBOX_DATABASE_URL` to sandbox direct Postgres URL
3. `export INSTITUTIONAL_MIGRATION_DRY_RUN=0`
4. `export INSTITUTIONAL_MIGRATION_APPLY_CONFIRM=<project_ref>`
5. `npx tsx scripts/institutional-replay-migration-apply.ts`

Rollback: restore PITR or recreate disposable DB; re-verify `service_role` INSERT revoked on `institutional_eligibility_consume_nonces`.

## 4. External partner provisioning

Checklist (no auto credential issuance): `lib/institutional/sandbox/externalPartnerProvisioningKit.ts`

Validate input shape:

```bash
npm run test:institutional-526 -- lib/institutional/sandbox/externalPartnerProvisioningKit.test.ts
```

## 5. Live sandbox integration test (opt-in)

```bash
export INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED=true
export INSTITUTIONAL_SANDBOX_API_KEY=abx_test_...
export INSTITUTIONAL_SANDBOX_PARTNER_ID=...
export INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID=...
export INSTITUTIONAL_SANDBOX_TEST_POLICY_ID=...
# optional: INSTITUTIONAL_SANDBOX_WRONG_TENANT_API_KEY, INSTITUTIONAL_SANDBOX_WEBHOOK_SECRET
npx tsx -e "import { runLiveSandboxIntegrationTests } from './lib/institutional/sandbox/liveSandboxIntegrationRunner.ts'; runLiveSandboxIntegrationTests().then(r => console.log(JSON.stringify(r,null,2)))"
```

## 6. Proof packet

```bash
npx tsx scripts/institutional-integration-proof-packet.ts
```

## 7. Solana governance (read-only)

```bash
npx tsx scripts/institutional-solana-governance-evidence.ts
```

Mainnet promotion is **not** required for off-chain sandbox eligibility API.
