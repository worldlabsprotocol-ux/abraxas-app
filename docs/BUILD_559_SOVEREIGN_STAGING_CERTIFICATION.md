# Build #559 — Sovereign staging deployment and certification

## 1. Operational staging status (this run)

| Milestone | Result |
|-----------|--------|
| **Operational sovereign staging** | **BLOCKED** — `ABRAXAS_SOVEREIGN_ENV_CLASS=disposable` in agent environment, not `staging` |
| **OBSERVED_STAGING_HTTP** | **BLOCKED** — `ABRAXAS_STAGING_HTTP_BASE_URL` unset |
| **OBSERVED_LIFECYCLE_HTTP_BOUNDARIES** | **BLOCKED** — requires staging HTTP base |
| **SYNTHETIC_LIFECYCLE_CERTIFIED** | **PASS** (agent VM disposable PG — Build #556 vitest, not human IDV) |
| **Adversarial trust (synthetic PG)** | **PASS** — Build #555 vitest |
| **FULL_PROTOCOL_LIFECYCLE_CERTIFIED** | **NOT CLAIMED** — authenticated staging E2E (consent → partner receipt) not automated |
| **Recovery drill** | **BLOCKED** — restore Postgres (5433) not listening; operator restore authorization not set |

Run inventory (redacted):

```bash
npm run sovereign-runtime:inventory-staging-559
npm run sovereign-runtime:certify-559
```

## 2. Infrastructure inventory (authorized agent VM)

| Component | Observed |
|-----------|----------|
| PostgreSQL 16+ | **Partial** — `127.0.0.1:5432` accepting connections (disposable `sovereign_cert`) |
| Restore Postgres | **Missing** — `127.0.0.1:5433` not accepting |
| Docker staging stack | **Unavailable** — no Docker in agent VM |
| Evidence storage | **Present** — `ABRAXAS_EVIDENCE_STORAGE_ROOT` set (disposable path) |
| Signing / encryption keys | **Present** (length only in inventory; values never logged) |
| Staging HTTP deployment | **Unknown** — no `ABRAXAS_STAGING_HTTP_BASE_URL` |
| Vercel project env | **Not readable** — MCP scope forbidden (403) |
| Supabase as sovereign authority | **Not used** for disposable cert path (Supabase placeholders in `.env.local` only) |

## 3. HTTP lifecycle (observed vs synthetic)

**Observed (deployed staging only)** — `observe-staging-lifecycle-http-559.ts`:

| Step | Route | Pass invariant |
|------|-------|----------------|
| Health | `GET /api/sovereign/health` | 200, `build:558`, `tier:STAGING_READY` |
| EVM wallet | `POST /api/auth/passport-evm/challenge` | 200/400/403/503 + JSON `ok` |
| Solana wallet | `POST /api/auth/passport-solana/challenge` | same |
| Capture boundary | `POST /api/identity/documents/capture` | 4xx (unauthenticated fail-closed) |
| Admin review | `GET /api/admin/identity/queue` | 401 or 403 |

**Synthetic (isolated PG)** — Build #556 vitest: wallet subjects, consent, custody, admin approve, revoke, offline receipt verify, adversarial #555.

## 4. Adversarial trust

Executed via `build555Security.adversarial.test.ts` when disposable PG available. Invariants: cross-holder denial, replay, signature vs authorization separation.

## 5. Recovery

Requires: staging env, `ABRAXAS_BACKUP_MANIFEST_PATH`, restore operator authorization, independent restore endpoint, live `current_database()` pre-check (#558).

## 6. Founder actions (smallest set)

1. Provision **persistent staging** Postgres + **restore** instance (or second DB on isolated host/port).
2. Mount **evidence** and **backup** volumes; set `ABRAXAS_BACKUP_SCOPE=sovereign`, `ABRAXAS_BACKUP_OUTPUT_DIR`.
3. Deploy Next.js with `.env.sovereign.staging.example` (`ABRAXAS_SOVEREIGN_ENV_CLASS=staging`, `ABRAXAS_SOVEREIGN_DATABASE_ID=abraxas_sovereign_staging`).
4. Set **`ABRAXAS_STAGING_HTTP_BASE_URL`** to the deployed staging API.
5. One-time schema apply with founder staging migration authorization (#558).
6. Run `npm run sovereign-runtime:certify-559` on authorized operator workstation connected to staging.

## 7. Commands

```bash
npm run sovereign-runtime:inventory-staging-559
npm run sovereign-runtime:activate-staging-558
npm run sovereign-runtime:observe-staging-http-558
npm run sovereign-runtime:observe-staging-lifecycle-http-559
npm run sovereign-runtime:certify-559
npm run test:sovereign-activation-env
npm run test:sovereign-certification
```
