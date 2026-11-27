# BUILD #959 — Complete sovereign non-production activation

**Stack name:** `abraxas-np-institutional-1`  
**Software baseline (frozen for this build):** `d10bf66f` · [PR #950](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/950)  
**Production baseline (forbidden):** `ffe4cd85`  
**Prior handoffs:** BUILD #956 operational readiness, BUILD #957–#958 activation reports (`/opt/cursor/artifacts/`)

**Phase 1 (this document):** Exact resource envelope for founder **cost approval** — no billable provisioning until approved.  
**Phases 2–4:** Execute only after approval + secrets on the authorized Secrets page.

---

## Finish-line status

| Gate | Status |
|------|--------|
| Software acceptance | **Complete** (`d10bf66f`) |
| Infrastructure cost approval | **Next** (founder) |
| Live custody + databases | Pending approval |
| Real independent verification | Pending activation |
| Operational GO | **NO-GO** until Phase 3 passes on live stack |

---

## What to reuse vs provision new

### Reuse (no new spend; already in repo / prior art)

| Asset | Role in activation |
|-------|-------------------|
| Worker + auth at `d10bf66f` | `npm run operator:institutional-signing-worker` |
| Sovereign SQL `database/sovereign/migrations/000–012` | Schema, registry continuity (011), governance pin (012) |
| Disposable proof harness | `ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1` vitest suites (CI-equivalent baseline) |
| Live KMS proof harness | `ABRAXAS_AWS_KMS_SIGNING_TEST=1` + `institutionalSigner.aws.integration.test.ts` |
| `@abraxas/independent-verifier` | Phase 3 portable verification (off-worker host) |
| `docs/operations/SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md` | Ownership, backup, restore drill contract |
| `docker/sovereign-staging/docker-compose.yml` | **Operator reference only** — not a substitute for approved cloud Postgres |
| BUILD #956 §5 test sequence | Post-activation acceptance checklist |

### Do not reuse (explicit out of scope)

| Asset | Reason |
|-------|--------|
| Production Supabase `bztwutzprwsdrtqdpymf` | Frozen |
| Demo Supabase `ocntwbxarpjeixdnzide` / `demo.abraxasworld.xyz` | Not in scope unless founder names Demo in approval |
| Cursor Cloud agent VM | Ephemeral; not dedicated signing host |
| `ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY=1` on activation stack | Forbidden for live custody evidence |

---

## Deployment options (pick one at approval)

### Option A — Minimal single host (lowest cost)

One Linux VM runs: Caddy (443) → loopback worker (3848), local Postgres 16 (primary + optional restore on second port/volume).

| Resource | Spec |
|----------|------|
| Compute | 1× `t3.small` or equivalent (2 vCPU, 2 GiB), 30 GiB encrypted EBS |
| Postgres | Self-managed on same VM (not RDS) |
| KMS | 2× AWS KMS asymmetric signing keys (account-level) |
| DNS | 1 hostname → VM public IP |
| TLS | Let’s Encrypt via Caddy **or** ACM if using ALB (Option B) |

**Indicative monthly:** **~$22–28** (VM + EBS) + **~$2** (KMS keys) + **~$3–8** (monitoring/logs) ≈ **$30–40/mo**.

### Option B — VM worker + managed Postgres (cleaner DB ops)

| Resource | Spec |
|----------|------|
| Worker VM | `t3.small` (ingress + worker only) |
| Postgres | RDS `db.t4g.micro` (or Aurora Serverless v2 minimum) |
| KMS | Same as Option A |

**Indicative monthly:** **~$55–75/mo** (includes RDS micro + VM).

**Recommendation for first proof:** **Option A** unless the team already runs an approved non-prod Postgres cluster (then reuse DB only; still new KMS keys).

---

## Security boundaries (non-negotiable)

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │ TLS edge :443    │  Institutional caller auth (Bearer and/or mTLS)
              │ (Caddy/nginx)    │
              └────────┬────────┘
                       │ HTTP → 127.0.0.1:3848 only
                       ▼
              ┌─────────────────┐
              │ Signing worker   │  KMS issuer + status IAM (least privilege)
              │ 127.0.0.1:3848   │  Four scoped caller secrets
              │                  │  ABRAXAS_SOVEREIGN_STAGING_PG_URL as runtime role
              │                  │  **NO** ABRAXAS_GOVERNANCE_OPERATOR_PG_URL
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Sovereign PG     │  abraxas_runtime + receipt/continuity tables
              └─────────────────┘

  (separate credential path)
              ┌─────────────────┐
              │ Governance       │  abraxas_governance_operator login only
              │ operator host    │  ABRAXAS_GOVERNANCE_OPERATOR_PG_URL
              └────────┬────────┘
                       ▼
              Same DB cluster, role-isolated (012)
```

| Control | Enforcement |
|---------|-------------|
| Public worker port | SG/firewall: **deny** inbound TCP 3848 from `0.0.0.0/0`; allow 443 to edge only |
| Loopback bind | `ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST=127.0.0.1` (startup rejects `0.0.0.0`) |
| Governance on worker | `governance_operator_url_forbidden_on_worker` |
| Custody isolation | Two KMS keys + two IAM users; cross-key `Sign` → `AccessDenied` (live test) |
| Exportable JWK on worker | Startup rejects `ABRAXAS_*_PRIVATE_JWK` |
| Verifier independence | Phase 3 verifier runs **outside** worker VM with portable artifacts only |

---

## Environment variables by host

### A. Signing worker (`/etc/abraxas/institutional-worker.env`)

| Variable | Required | Notes |
|----------|----------|-------|
| `ABRAXAS_INSTITUTIONAL_SIGNING_WORKER` | `1` | Process guard |
| `ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT` | `demo` | Non-prod class for this stack |
| `ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST` | `127.0.0.1` | |
| `ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_PORT` | `3848` | |
| `ABRAXAS_WORKER_CALLER_STATUS_SCOPE` | `partner` or `institution_wide` | |
| `ABRAXAS_WORKER_CALLER_{STATUS,ISSUER,AUTHORITY,HEALTH}_SECRET` | 4 distinct values | Rotate independently |
| `ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID` | string | Logical id in registry |
| `ABRAXAS_STATUS_SIGNER_KEY_ID` | string | |
| `ABRAXAS_AWS_KMS_REGION` | e.g. `us-west-2` | |
| `ABRAXAS_AWS_KMS_ISSUER_KEY_ID` | KMS key id/arn | ≠ status key |
| `ABRAXAS_AWS_KMS_STATUS_KEY_ID` | KMS key id/arn | |
| `ABRAXAS_AWS_KMS_ISSUER_IDENTITY` | string | Audit label |
| `ABRAXAS_AWS_KMS_STATUS_IDENTITY` | string | |
| `ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID` | IAM user A | Sign/GetPublicKey on issuer key only |
| `ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY` | IAM user A | |
| `ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID` | IAM user B | |
| `ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY` | IAM user B | |
| `ABRAXAS_SOVEREIGN_ENV_CLASS` | `staging` | |
| `ABRAXAS_SOVEREIGN_STAGING_PG_URL` | `postgresql://abraxas_runtime:…` | TLS to DB |
| `ABRAXAS_PERSISTENCE_BACKEND` | `postgres_direct` | |

**Forbidden on worker:** `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL`, `ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY`, exportable private JWKs, `VERCEL*`, shared `ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN`.

### B. Governance operator (separate host or break-glass session)

| Variable | Required |
|----------|----------|
| `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL` | `postgresql://abraxas_governance_operator:…` |
| `ABRAXAS_SOVEREIGN_ENV_CLASS` | `staging` |
| Ceremony authorization flags | Per `governanceTrustCeremony.ts` disposable contract |

**Forbidden on operator workstation:** worker caller secrets, KMS status/issuer **secret** keys used by worker (operator does not sign receipts).

### C. Independent verifier (laptop/CI — Phase 3)

No custody secrets. Inputs: exported receipt bundle, trust anchor document, status statement JSON (from sovereign DB read path or API).

### D. Optional live proof runner (same VPC as KMS)

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_AWS_KMS_SIGNING_TEST=1` | Enables live integration test |
| (+ full set from `awsKmsLiveTestEnv.ts`) | Same as worker KMS vars |

---

## KMS IAM shape (founder / cloud admin)

Create **two IAM users** (or roles with session boundaries), no shared policy:

- **Issuer principal:** `kms:Sign`, `kms:GetPublicKey`, `kms:DescribeKey` on `issuer-key-arn` only.  
- **Status principal:** same on `status-key-arn` only.  
- Deny `kms:Sign` on the opposite key (integration test asserts `AccessDenied`).

Keys: AWS KMS asymmetric **ED25519** signing keys (`ECC_EDWARDS25519`), `EXTERNAL` origin false (non-exportable by provider contract).

---

## Ingress (TLS on 443)

**Minimal Caddy pattern** (worker unchanged):

```caddy
signing-np.abraxas.example {
    tls /etc/ssl/certs/fullchain.pem /etc/ssl/private/privkey.pem
    reverse_proxy 127.0.0.1:3848
}
```

Add **mTLS** (`client_auth`) when institutional callers present client certificates.

**Post-config tests (Phase 2):**

- `curl https://signing-np…/v1/health` with valid Bearer → 200.  
- `curl http://<public-ip>:3848/…` → **timeout/refused**.  
- `nmap` / SG audit: 3848 not open publicly.

---

## Database setup (migrations 011 & 012)

1. Create database `abraxas_sovereign_staging` (new instance; not Production ref).  
2. Apply sovereign migrations **000–010** per `database/sovereign/migrations/` order.  
3. Apply **011** `issuer_authority_registry_continuity.sql`.  
4. Apply **012** `issuer_governance_trust_pin.sql` (creates roles `abraxas_runtime`, `abraxas_governance_operator`).  
5. Run disposable-equivalent role provisioning pattern from `disposableSovereignRoles.ts` on admin connection, or operator SQL documented in BUILD #956.  
6. Execute governance trust pin ceremony (`installDisposableGovernanceTrustPin` contract) on **operator** credentials only.

Validate isolation: `ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/persistence/boundary/issuerAuthority/governanceOperatorIsolation.test.ts` **against staging URLs** (operator-run; not agent VM until URLs exist).

---

## Monitoring, logging, restart, backup (required controls)

| Control | Minimum implementation |
|---------|-------------------------|
| **Restart** | `systemd` unit `Restart=on-failure`, `RestartSec=5` for worker |
| **Health** | Poll `POST /v1/health` with health-scope Bearer from edge or synthetic canary |
| **Logs** | `journald` + ship to CloudWatch/Datadog (no secret values in logs) |
| **Metrics** | CPU, disk, PG connections, worker listen check |
| **Backup** | Daily encrypted logical backup per `SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md` |
| **Restore drill** | Quarterly to `ABRAXAS_SOVEREIGN_RESTORE_PG_URL` with authorization env pair |
| **Alerts** | Worker down, 5xx rate on ingress, PG disk &gt; 80% |

---

## Phase 2 — Activation checklist (after approval only)

- [ ] Founder signs Option A or B + monthly spend cap  
- [ ] Provision VM (+ RDS if Option B) + KMS keys + IAM users  
- [ ] Apply migrations 000–012; complete governance pin ceremony  
- [ ] Install worker at commit `d10bf66f`; systemd enabled  
- [ ] Configure Caddy/nginx on 443; verify 3848 not public  
- [ ] Enter secrets via Cursor Secrets page / host `EnvironmentFile` (never git)  
- [ ] Confirm worker env **excludes** governance DSN  
- [ ] Run `ABRAXAS_AWS_KMS_SIGNING_TEST=1` live KMS tests from approved runner  

---

## Phase 3 — Sovereign execution proof (live only)

Execute in order; archive redacted logs:

1. Authorized caller → edge → worker (health, then status/issuer routes as applicable).  
2. Recorded decision path on staging sovereign PG (real fixture or controlled institutional request).  
3. KMS-signed issuer authority + status statements (not demo-memory).  
4. Export portable bundle; verify on **separate** host with `@abraxas/independent-verifier`.  
5. Negative matrix: wrong bearer, tampered payload, revoked issuer, expired `not_after`, replayed checkpoint, governance substitution attempt.  
6. Recovery: restart worker, brief PG disconnect, confirm fail-closed (no unsigned bypass).

Reference tests (run against **staging**, not disposable localhost):

```bash
ABRAXAS_AWS_KMS_SIGNING_TEST=1 npx vitest run lib/institutional/signing/institutionalSigner.aws.integration.test.ts
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/institutional/signing/recordedWorkflow.integration.test.ts
```

Hosted institutional journey (only if Demo explicitly approved):

```bash
LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz npm run build864:demo-institutional-receipt-acceptance
```

---

## Phase 4 — Acceptance report template

Deliver single markdown artifact with:

1. Named infra + actual monthly invoice estimate  
2. Commit `d10bf66f` + merge status  
3. SG / firewall evidence (3848 closed)  
4. TLS handshake capture (redacted)  
5. KMS live test output (cross-key denial + verifier accept)  
6. Governance role SQLSTATE proofs on staging  
7. Independent verifier transcript  
8. Negative test table  
9. Recovery drill results  
10. **Operational GO / NO-GO**

**Rule:** Operational **GO** only if every row in Phase 3 is **pass** with live evidence.

---

## Founder approval request (single signature)

Approve **Option A** or **Option B**, **AWS region**, **hostname**, and **~$30–40/mo** (A) or **~$55–75/mo** (B) spend cap for `abraxas-np-institutional-1`.

Confirm **Demo DB out of scope** (default) or name explicit Demo scope for `build864`.

Upon approval: provision resources, populate Secrets, execute Phase 2–4 without application code changes unless a reproducible operational defect is found.
