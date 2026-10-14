# Build #558 — Persistent sovereign staging

First **persistent**, Abraxas-operated staging tier on top of Build #552–#557. Supabase is not the sovereign trust or persistence dependency.

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Staging Next.js API (persistent runtime)                         │
│  ABRAXAS_SOVEREIGN_ENV_CLASS=staging                             │
│  ABRAXAS_SOVEREIGN_DATABASE_ID=abraxas_sovereign_staging         │
│  GET /api/sovereign/health                                       │
└────────────┬───────────────────────────────┬────────────────────┘
             │ postgres_direct + TLS          │ encrypted volume
             ▼                                ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│ PostgreSQL 16+ (primary)    │   │ ABRAXAS_EVIDENCE_STORAGE_ROOT │
│ durable state               │   │ AES-256-GCM blobs             │
└────────────┬───────────────┘   └──────────────────────────────┘
             │
             ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│ Build #552 backup           │   │ Independent restore Postgres  │
│ ABRAXAS_BACKUP_SCOPE=       │   │ ABRAXAS_SOVEREIGN_RESTORE_    │
│ sovereign                   │   │ PG_URL (drill target only)    │
└────────────────────────────┘   └──────────────────────────────┘
```

| Tier | Command | Meaning |
|------|---------|---------|
| **STAGING_PERSISTENT_READY** | `npm run sovereign-runtime:activate-staging-558` | Config + read-only inventory probe — **no schema apply** |
| **OBSERVED_STAGING_HTTP** | `npm run sovereign-runtime:observe-staging-http-558` | Live HTTP probes — **not** synthetic fixture tests |
| **DISPOSABLE_CERTIFIED** | `npm run sovereign-runtime:certify-disposable-557` | Local disposable only — does **not** certify staging |

Schema bundle label: `sovereign-runtime-v558` (fingerprint from `SOVEREIGN_RUNTIME_SCHEMA_MANIFEST`).

## 2. Deployment procedure

### 2.1 Local operator stack (development)

```bash
export SOVEREIGN_STAGING_POSTGRES_PASSWORD='…'
export SOVEREIGN_STAGING_RESTORE_POSTGRES_PASSWORD='…'
docker compose -f docker-compose.sovereign.staging.yml up -d
```

Create host paths for evidence and backups (example):

```bash
sudo mkdir -p /var/abraxas/staging/{evidence,backups}
sudo chown "$USER" /var/abraxas/staging/{evidence,backups}
```

Copy `.env.sovereign.staging.example` → staging deployment env. Generate keys:

```bash
openssl rand -base64 32   # ABRAXAS_EVIDENCE_ENCRYPTION_KEY
openssl rand -base64 32   # ABRAXAS_BACKUP_ENCRYPTION_KEY
# ABRAXAS_SIGNING_KEY — Ed25519 private JWK (operational custody)
```

### 2.2 Initial schema (founder authorization only)

Never run migrations from `activate-staging-558`. One-time apply after review:

```bash
export ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED=true
export ABRAXAS_SOVEREIGN_STAGING_SCHEMA_CHANGE_AUTHORIZED=true
export ABRAXAS_SOVEREIGN_FOUNDER_STAGING_AUTHORIZATION=<founder-token>
export ABRAXAS_SOVEREIGN_FOUNDER_STAGING_AUTHORIZATION_EXPECTED=<same>
npm run sovereign-idv:apply-schema
```

### 2.3 Readiness (no mutations)

```bash
npm run sovereign-runtime:activate-staging-558
```

### 2.4 Deploy Next.js staging API

Set env from template; `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`; omit Supabase service role on identity routes.

Health: `GET /api/sovereign/health` → `200` when `tier: STAGING_READY`.

### 2.5 Observed HTTP certification

```bash
export ABRAXAS_STAGING_HTTP_BASE_URL=https://<staging-host>
npm run sovereign-runtime:observe-staging-http-558
```

### 2.6 Backup and restore drill

```bash
npm run sovereign-runtime:backup-staging-558
export ABRAXAS_BACKUP_MANIFEST_PATH=/var/abraxas/staging/backups/<latest>.manifest.json
npm run sovereign-runtime:restore-drill-staging-558
```

Restore always targets **`ABRAXAS_SOVEREIGN_RESTORE_PG_URL`**, never the primary staging database in shared operator drills.

## 3. Rollback

| Step | Action |
|------|--------|
| Application | Redeploy previous release; env unchanged |
| Database | **Do not** auto-migrate down; restore from last verified manifest to **restore target**, validate, then founder-directed cutover |
| Evidence | Restore filesystem snapshot matching backup inventory hash |
| Signing | Prior `ABRAXAS_SIGNING_KEY` + registry row must remain valid for receipts issued before rotation |

Fail closed: missing health, schema, or keys → routes return **deny / unavailable**, not silent allow.

## 4. Certification results (this build)

| Check | Result | Evidence |
|-------|--------|----------|
| Staging env gates + tests | **PASS** | `npm run test:sovereign-activation-env` |
| Sovereign fixture lifecycle (#556) | **PASS** (synthetic) | `npm run test:sovereign-certification` |
| Persistent staging HTTP | **BLOCKED** | No founder-provisioned `ABRAXAS_STAGING_HTTP_BASE_URL` in this agent environment |
| Persistent backup/restore drill | **BLOCKED** | No long-lived staging PG + restore pair provisioned here |
| Production readiness | **NOT CLAIMED** | Synthetic IDV only in disposable tier |

## 5. Founder provisioning requirements

1. Managed or self-hosted **PostgreSQL 16+** with TLS, scoped role, `abraxas_sovereign_staging` database identity.
2. **Persistent volumes** for evidence and encrypted backup output (separate destinations).
3. **Independent restore** Postgres instance (or isolated database) for non-destructive drills.
4. **Keys**: evidence encryption, backup encryption, Ed25519 signing (KMS/HSM for long-term).
5. **Staging host** for Next.js API with env from `.env.sovereign.staging.example`.
6. **`ABRAXAS_STAGING_HTTP_BASE_URL`** for observed certification.
7. **Monitoring** on `/api/sovereign/health`, backup job success, disk usage, failed admin auth.
8. **Founder tokens** for any persistent schema change (`ABRAXAS_SOVEREIGN_STAGING_SCHEMA_CHANGE_AUTHORIZED` + matching founder authorization pair).

## 6. Remaining blockers

| Blocker | Notes |
|---------|--------|
| **Staging deployment URL** | Required for `OBSERVED_STAGING_HTTP` tier |
| **Founder-managed PG + volumes** | Agent cannot provision paid/managed infra |
| **Full lifecycle HTTP automation** | Wallet verify → capture → admin → partner receipt needs authenticated sessions beyond smoke probes |
| **Human IDV on staging** | Real reviewer workflow — not simulated |

## 7. Commands

```bash
npm run test:sovereign-activation-env
npm run sovereign-runtime:activate-staging-558
npm run sovereign-runtime:backup-staging-558
npm run sovereign-runtime:restore-drill-staging-558
npm run sovereign-runtime:observe-staging-http-558
npm run build
```
