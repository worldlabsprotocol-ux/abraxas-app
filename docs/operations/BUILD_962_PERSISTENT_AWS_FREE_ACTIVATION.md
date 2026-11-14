# BUILD #962 — Persistent AWS-free sovereign activation

**Baseline:** BUILD #961 merged (`7548d35c` on `main`) — disposable CI ceremony **GO**.  
**This build:** operational activation on **founder-controlled persistent** infrastructure. No new custody adapters.

## Founder questions (answers)

### 1. Can we reuse infrastructure we already have?

**Yes, if you already operate a founder-controlled Linux host** (or can repurpose one). The repo already ships:

| Asset | Role |
|-------|------|
| `docker-compose.sovereign.staging.yml` | Loopback Postgres 16 primary + restore |
| `docker/sovereign-staging/docker-compose.yml` | CI-equivalent sovereign stack |
| `scripts/institutional-signing-worker.ts` | AWS-free `self-hosted-file` worker (`127.0.0.1:3848`) |
| `deploy/systemd/abraxas-sovereign-portable.service.example` | Long-lived portable API pattern |
| `deploy/systemd/abraxas-institutional-signing-worker.service.example` | Long-lived signing worker pattern |
| `sovereign-runtime:*` scripts | Staging inventory, backup/restore drill (#558–#559) |
| Vercel project `abraxas-app` | Next.js / receipt **runtime** — **cannot** host the signing worker (`VERCEL` forbidden) |

**Not reusable as a persistent trust host:** Cursor Cloud Agent VMs, GitHub Actions runners, disposable CI Postgres.

**Observed in this build:** No founder-attested persistent hostname, SSH access, or operator env files are available to the cloud agent. BUILD #816 status remains **Pending external host**.

### 2. Can we activate without creating another monthly bill?

**Yes, on a host you already pay for (or run at home).** Marginal cost **$0** when:

- Postgres runs on the same machine (compose or existing instance).
- Ed25519 seeds live on disk (`chmod 600`); no KMS/HSM bill.
- Loopback worker; optional reverse proxy you already operate.

**Optional new spend (founder approval only):**

| Option | Typical cost | When needed |
|--------|----------------|-------------|
| New small VPS (1 vCPU, 2GB, 40GB) | ~$5–12/mo | No suitable Linux host today |
| Managed Postgres (Neon, etc.) | ~$0–25/mo | No ops capacity for self-hosted PG |
| AWS EC2/KMS (BUILD #959 path) | Variable | **Not required** for AWS-free NP |

Do **not** provision paid resources from this build without explicit approval.

### 3. What remains before persistent non-production **GO**?

| Step | Owner | Status |
|------|--------|--------|
| Choose authorized persistent Linux host | Founder | **Required** |
| Deploy sovereign Postgres + governance role URLs | Operator | **Required** |
| Generate/install NP Ed25519 seed files (not in git) | Operator | **Required** |
| systemd (or equivalent) for worker + restart policy | Operator | **Required** |
| Separate env files: worker vs governance/runtime | Operator | **Required** |
| mTLS or authenticated ingress before external worker access | Operator | **Required** for exposure beyond loopback |
| Run BUILD #961 ceremony against **persistent** URLs | Operator | **Required** |
| Independent verifier from **second machine** (no DB/keys) | Operator | **Required** |
| Backup + restore drill on persistent volumes | Operator | **Required** |
| Set `ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED` | Founder | **Required** for attested GO |
| Set `ABRAXAS_INSTITUTIONAL_WORKER_MTLS_CONFIGURED=1` after ingress proof | Operator | **Required** for external access tier |

**Engineering:** No further code is required to activate; only host operations and evidence capture.

---

## Phase 1 — Infrastructure audit (this agent)

| Control | Abraxas-controlled? | Evidence |
|---------|---------------------|----------|
| Vercel `abraxas-app` | Yes (app delivery) | MCP project list |
| Persistent sovereign PG | **Not attested** | #816 pending |
| Institutional worker on NP host | **Not deployed** | No systemd attestation |
| AWS KMS / EC2 (#959) | Deferred | Optional |
| Software `self-hosted-file` | Ready in `main` | #961 CI |

**Host used in BUILD #962 agent work:** none — audit and inventory tooling only.

**Source commit for activation:** `7548d35c` (includes BUILD #961).

---

## Phase 2 — Secure activation (operator runbook)

### 2.1 Postgres (persistent)

```bash
# On authorized host — bind Postgres to loopback only (see compose files)
docker compose -f docker-compose.sovereign.staging.yml up -d
```

Apply sovereign slice schema per `SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md` with founder migration flags.

Provision **distinct** runtime and governance operator connection URLs (see `provisionDisposableSovereignRoleUrls` pattern in tests — production uses your role management).

### 2.2 Worker custody (AWS-free)

```bash
# One-time — on host only, never commit
umask 077
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' > /var/abraxas/np/issuer.seed
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' > /var/abraxas/np/status.seed
chmod 600 /var/abraxas/np/*.seed
```

Copy `.env.institutional-worker.np.example` → `/etc/abraxas/institutional-worker.env` (no governance DB URL in this file).

```bash
npm run operator:institutional-signing-worker
# Or enable deploy/systemd/abraxas-institutional-signing-worker.service.example
```

### 2.3 Governance isolation

- Governance credentials and `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL` live on **governance operator** / API runtime env only.
- Validate worker env file:

```bash
ABRAXAS_BUILD_962_WORKER_ENV_FILE=1 ABRAXAS_BUILD_962_STRICT=1 \
  npx tsx scripts/sovereign-runtime/inventory-build-962-persistent-np.ts
```

### 2.4 Monitoring and recovery

- systemd `Restart=on-failure`
- `sovereign-runtime:backup-staging-558` + `restore-drill-staging-558` on persistent volumes
- Document RPO/RTO from drill logs (not Production SLO)

---

## Phase 3 — Live sovereign verification

On the **persistent** host (not CI):

```bash
export ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1
export ABRAXAS_DISPOSABLE_PG_TEST_URL="$ABRAXAS_DATABASE_URL"   # or dedicated NP test role
export ABRAXAS_GOVERNANCE_OPERATOR_PG_URL="..."                # governance only — not on worker
npm run sovereign:build-961-aws-free-ceremony
```

From a **second machine** (laptop, CI runner, partner VM):

- Verify portable receipt + signed status with `@abraxas/independent-verifier` / public verify path only.
- Confirm no private JWK fields and no database connectivity required.

Repeat negatives already encoded in ceremony tests: replay, partner scope, tampered status (see BUILD #961 doc).

---

## Phase 4 — Inventory command

Redacted JSON for operator preflight:

```bash
npm run sovereign-runtime:inventory-build-962-persistent-np
```

Tiers:

| Tier | Meaning |
|------|---------|
| `BLOCKED` | Hard misconfiguration — do not go live |
| `LIVE_VERIFICATION_PENDING` | Config probes pass; live ceremony + attestation still required |
| `OPERATIONAL_ATTESTED` | `ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED` set after live evidence |

---

## GO / NO-GO (BUILD #962)

| Classification | Verdict |
|----------------|---------|
| **Disposable CI / BUILD #961** | **GO** (merged) |
| **Persistent NP operational (hosted)** | **NO-GO** — pending founder host, live ceremony, independent verifier off-box, backup drill, attestation |
| **Production institutional** | **NO-GO** — software seeds are not hardware non-exportable |
| **AWS mandatory for NP** | **NO** — optional `aws-kms` adapter only |

---

## Explicit non-actions (without approval)

- Purchasing VPS, RDS, or KMS
- Deploying worker to Vercel
- Production env or promotion
- Claiming hardware non-exportability for file-based seeds