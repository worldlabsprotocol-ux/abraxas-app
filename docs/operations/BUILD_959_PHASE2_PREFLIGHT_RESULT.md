# BUILD #959 Phase 2 — Provisioning preflight result

**Stack:** `abraxas-np-institutional-1`  
**Founder approval:** Option A · `us-east-1` · `np-institutional.abraxasworld.xyz` · **$50/mo ceiling** · Demo **OUT** · Production **OUT**  
**Software pin:** `d10bf66f`  
**Executed:** Cursor agent preflight (no cloud provisioned)

---

## Verdict

| Check | Result |
|-------|--------|
| Founder configuration approved | **YES** |
| Itemized cost ≤ $50 ceiling | **YES** (~$27–34/mo all-in indicative; see revised table) |
| AWS account access from agent | **NO** |
| DNS ready for EC2 ingress | **NO** (hostname on Vercel edge, deployment not found) |
| Live secrets available | **NO** (bound on Secrets page; values not on agent VM) |
| **Proceed to EC2/KMS provision from this agent** | **NO-GO** |
| **Proceed from operator AWS account** | **GO** (after DNS repoint plan) |

**Operational GO (Phases 3–4):** **NO-GO** — infrastructure not activated.

---

## Approved configuration (record)

| Field | Value |
|-------|-------|
| Option | **A** (single VM + host Postgres + KMS) |
| Region | `us-east-1` |
| Hostname | `np-institutional.abraxasworld.xyz` |
| Spend ceiling | **$50 USD/month** (founder boundary; configure AWS Budgets + alerts) |
| Sovereign DB | New isolated Postgres on VM (not Demo, not Production) |
| Worker commit | `d10bf66f` |

---

## Itemized monthly estimate (`us-east-1`, Option A) — revised (BUILD #959 activation)

Includes **public IPv4**, **EBS snapshots**, **monitoring**, and light traffic. Taxes are **not** estimated here (jurisdiction/account-specific; typically not included in AWS list prices).

| Line item | Qty | Unit (AWS list, approx.) | Est. USD/mo |
|-----------|-----|---------------------------|-------------|
| EC2 `t3.small` Linux | 730 h | $0.0208/h | **~$15.18** |
| EBS `gp3` 30 GiB (root) | 30 GiB | $0.08/GiB-mo | **~$2.40** |
| **In-use public IPv4** (EIP or instance public IP) | 730 h | **$0.005/h** | **~$3.65** |
| KMS asymmetric signing keys | 2 | $1.00/key-mo | **~$2.00** |
| KMS `Sign` / `GetPublicKey` (activation month) | ~10k | $0.0015/1k (tiered) | **~$0.15** |
| Data transfer out (light) | ~10 GB | ~$0.09/GB | **~$0.90** |
| CloudWatch Logs (basic ingest + storage) | — | — | **~$2–5** |
| **EBS snapshots** (e.g. 1× 30 GiB retained) | 30 GiB-mo | $0.05/GiB-mo | **~$1.50** |

| Subtotal (indicative) | |
|-----------------------|--|
| **Low** | **~$27** |
| **High** (heavier logs + 2 snapshots) | **~$34** |

**Still under founder ceiling ($50/mo)** with **~$16–23** headroom unless optional services are added.

**Recurring charges that blow the budget (do not provision):** NAT Gateway (~**$32/mo** + traffic), ALB (~**$16/mo** + LCU), second public IPv4 (+**~$3.65/mo** each), RDS, idle/unattached EIPs.

**Tax / billing:** AWS invoices may add sales/VAT depending on account country; model **~10% buffer** only if your account history shows tax lines.

**Billing controls (operator):**

1. AWS Budgets: fixed $50 with 80% / 100% email alerts.  
2. Tag resources `Project=abraxas-np-institutional-1`, `Environment=nonprod`.  
3. Stop provisioning if terraform/plan projects **> $50/mo** recurring.

---

## Preflight observations (this run)

| Test | Observation |
|------|-------------|
| `aws` CLI on agent VM | **Not installed** |
| `AWS_*` environment | **Absent** |
| `https://np-institutional.abraxasworld.xyz` | HTTP **404**; `server: Vercel`; `x-vercel-error: DEPLOYMENT_NOT_FOUND` |
| DNS `dig +short` | `216.150.1.65`, `216.150.16.129` (Vercel anycast — **not** an EC2 target yet) |
| Vercel MCP domain API | **403** (agent lacks `abraxasworld.xyz` admin) |

**DNS action before go-live (Production-safe):**

| Record | Action |
|--------|--------|
| `np-institutional.abraxasworld.xyz` | **Only** this host: `A` → EC2 **Elastic IP** (or `AAAA` if using IPv6 deliberately) |
| `abraxasworld.xyz` (apex) | **Do not change** (Production) |
| `www`, `demo`, and other existing names | **Do not change** unless explicitly approved |

If `np-institutional` currently aliases Vercel, repoint **only** that label to the EIP; Caddy on the VM terminates TLS. Confirm Production apex/`www` still resolve as before after the change (operator spot-check).

**DNS action before go-live:** Create or update **`A` record** for `np-institutional` → **Elastic IP** of signing VM. Remove Vercel-only routing for this hostname if it prevents TLS termination on the VM/Caddy.

---

## Security conditions (founder — must hold at activation)

1. Worker listens **`127.0.0.1:3848` only**.  
2. **443** TLS (optional mTLS) → authenticated reverse proxy → loopback worker.  
3. **Two KMS keys**; issuer and status IAM users **cannot** sign the opposite key.  
4. **`ABRAXAS_GOVERNANCE_OPERATOR_PG_URL`** never on worker.  
5. Migrations **000–012** on new sovereign DB; governance ceremony on operator path.  
6. Independent verifier runs **outside** signing host.  
7. Encrypted backups + restore drill; no secrets in git/logs/reports.

---

## Operator provisioning sequence (authorized after AWS login)

Execute from a **founder-controlled workstation** with AWS credentials (not the Cursor agent VM until AWS CLI + role are configured).

1. **Budget** — Create $50 budget + alerts.  
2. **KMS** — Create `abraxas-np-issuer` and `abraxas-np-status` Ed25519 signing keys; IAM users/policies per `BUILD_959_SOVEREIGN_NP_ACTIVATION.md`.  
3. **EC2** — `t3.small`, Ubuntu 24.04, 30 GiB encrypted root, **no public listener on 3848** (SG: 443 from internet, 22 from admin IP only).  
4. **Elastic IP** — Attach; point DNS `np-institutional.abraxasworld.xyz` → EIP.  
5. **Postgres 16** — On VM; apply `database/sovereign/migrations/` through **012**; provision `abraxas_runtime` / `abraxas_governance_operator`.  
6. **Worker** — Deploy `d10bf66f`; `/etc/abraxas/institutional-worker.env` (KMS + sovereign URL + caller secrets); **no** governance DSN.  
7. **Caddy** — TLS on 443; `reverse_proxy 127.0.0.1:3848`; enforce Bearer at edge or mTLS.  
8. **Governance** — Operator host/session only; pin ceremony.  
9. **Verify** — `scripts/operations/np-institutional-1-preflight.sh` on VM; port scan proves **3848** closed publicly.  
10. **Phase 3** — Live KMS tests + recorded workflow against staging URLs + off-host verifier.  
11. **Phase 4** — Consolidated GO/NO-GO artifact.

Local check script:

```bash
chmod +x scripts/operations/np-institutional-1-preflight.sh
./scripts/operations/np-institutional-1-preflight.sh
```

---

## Secrets (authorized names)

Populate on the **VM** and/or Cursor Secrets page when values exist — never commit:

- KMS bundle (`ABRAXAS_AWS_KMS_*` per `awsKmsLiveTestEnv.ts`)  
- `ABRAXAS_SOVEREIGN_STAGING_PG_URL` (runtime role)  
- `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL` (operator only)  
- Four `ABRAXAS_WORKER_CALLER_*_SECRET` values  
- `SOVEREIGN_POSTGRES_PASSWORD` (local postgres admin bootstrap on VM)

---

## What Cursor cannot complete without

1. **AWS programmatic access** (EC2, KMS, IAM, Budgets) on an operator or CI role.  
2. **DNS change authority** for `abraxasworld.xyz` (repoint `np-institutional`).  
3. **Secret values** on the signing host (declined on agent — expected until operator bind).

---

## Next step after operator provisions

Re-run BUILD #959 **Phase 3–4** (live evidence):

- `ABRAXAS_AWS_KMS_SIGNING_TEST=1` → `institutionalSigner.aws.integration.test.ts`  
- Worker HTTP + edge TLS captures (redacted)  
- `ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1` integration tests against **staging URLs**  
- Independent verifier transcript from a separate machine  

Until then: **software GO**, **operational NO-GO**.

---

## Operational activation attempt (authorized operator path — Cursor run)

**Date:** 2026-11-11 · **Spend:** $0 · **Software:** `d10bf66f`

| Step | Directive | Result |
|------|-----------|--------|
| 1 | Confirm AWS identity | **STOP** — no `aws` CLI; no `AWS_*` on agent; cannot assume operator role from this VM |
| 2 | Recalculate cost (IPv4, snapshots, tax note) | **DONE** — ~$27–34/mo indicative; ceiling $50 |
| 3 | Provision resources | **Not executed** (blocked at step 1) |
| 4 | DNS `np-institutional` only | **Not executed** — no DNS API access; Vercel lacks agent permission on zone |
| 5 | Runtime secrets on hosts | **Not executed** — secret names bound; values not on agent |
| 6 | Phase 3 live tests | **Not executed** |
| 7 | Phase 4 acceptance | **Not executed** |

**Exact blocker:** **Step 1 — AWS programmatic access and operator identity** from an authorized environment (founder AWS console/CLI, SSO, or CI role). **DNS step 4** is the next hard gate after EC2+EIP exist.

**Unblock:** Follow **`docs/operations/BUILD_959_OPERATOR_HANDOFF.md`** from an authorized AWS console session. After provisioning, supply redacted Phase 3–4 logs to Cursor for attestation (do not re-run AWS checks on the agent VM).

**Operational GO:** **NO-GO** (evidence-backed).
