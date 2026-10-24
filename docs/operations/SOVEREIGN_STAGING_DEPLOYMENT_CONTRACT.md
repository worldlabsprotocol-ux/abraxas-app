# Sovereign staging deployment contract (Build #816)

**Purpose:** Reproducible Abraxas-controlled staging **without** Supabase as operational authority.  
**Not Production-ready** until founder attests external deployment (`ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED`).

## Ownership requirements (founder-controlled)

| Domain | Abraxas must control |
|--------|----------------------|
| Admin access | OS/VM or cloud account, not vendor default only |
| Database credentials | Rotation, least privilege, no shared Production roles |
| Network | Private or TLS-terminated exposure; no public Postgres |
| Encryption | `ABRAXAS_BACKUP_ENCRYPTION_KEY`, `ABRAXAS_EVIDENCE_ENCRYPTION_KEY` (32-byte base64) |
| Issuer keys | `ABRAXAS_SIGNING_KEY` — **compromise recovery is revocation + rotation, not backup restore** |
| Backups | Encrypted logical slice (`exportEncryptedSovereignSliceBackup`) to Abraxas-owned destination |
| Restore | Separate endpoint (`ABRAXAS_SOVEREIGN_RESTORE_PG_URL`), drill authorization flags |
| Migrations | Abraxas SQL manifest — not Supabase dashboard DDL |
| Monitoring | Operator-defined (not included in this contract file) |

## Required environment (persistent staging class)

```bash
ABRAXAS_SOVEREIGN_ENV_CLASS=staging
ABRAXAS_SOVEREIGN_DATABASE_ID=abraxas_sovereign_staging
ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
ABRAXAS_DATABASE_URL=postgresql://…/abraxas_sovereign_staging
ABRAXAS_SOVEREIGN_RESTORE_PG_URL=postgresql://…/abraxas_sovereign_staging_restore
ABRAXAS_EVIDENCE_STORAGE_ROOT=/var/abraxas/evidence
ABRAXAS_EVIDENCE_ENCRYPTION_KEY=<openssl rand -base64 32>
ABRAXAS_BACKUP_ENCRYPTION_KEY=<openssl rand -base64 32>
ABRAXAS_SIGNING_KEY=<Ed25519 private JWK>
ABRAXAS_BACKUP_SCOPE=sovereign
ABRAXAS_BACKUP_OUTPUT_DIR=/var/abraxas/backups
# Do NOT set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on sovereign hosts
```

Validate: `npx tsx scripts/sovereign/validate-staging-ownership.ts`

## Local reproducible stack (development / CI equivalence)

```bash
docker compose -f docker/sovereign-staging/docker-compose.yml up -d
```

Apply slice schema: migrations under `lib/persistence/boundary/sovereignSlice/schema.sql` (synthetic fixtures only).

Run CI-equivalent proof:

```bash
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/persistence/boundary/sovereignOperationalProof.integration.test.ts
```

Build **#820** three-layer trust acceptance (receipt + SIAS + signed status, adverse + recovery):

```bash
# CI / disposable contract (does not claim external attestation)
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/persistence/boundary/staging/threeLayerTrustAcceptance.integration.test.ts

# Operator host with primary + restore URLs (optional JSON report path)
npm run sovereign:build-820-acceptance
```

See `docs/operations/BUILD_820_EXTERNAL_STAGING_ACCEPTANCE.md`.

## Issuer compromise procedure (independent of backup)

1. Revoke compromised `signing_key_id` in `issuer_signing_keys` (authoritative state).  
2. Issue new key material; update verifier trust document / registry.  
3. **Do not** promote pre-compromise backups without re-applying revocations and key epoch checks.  
4. Offline receipt signatures may still verify historically; **current authorization** must fail for revoked issuers.

## External staging attestation (founder gate)

After deploying a real host:

1. Complete ownership checklist (all green via validate script).  
2. Run encrypted backup + restore drill on that host.  
3. Set `ABRAXAS_STAGING_HTTP_BASE_URL` and `ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED=<founder-approved-id>`.

Until then, status remains **pending** (CI disposable proof only).

## Explicit non-actions without approval

- Paid cloud provisioning  
- Production database access or copy  
- Production writer cutover  
- Managed database SaaS as implicit trust root  
