# BUILD #959 — Operator handoff (provision `abraxas-np-institutional-1`)

**Audience:** Human operator signed into an **authorized AWS account** and DNS admin for `abraxasworld.xyz`.  
**Not for:** Cursor Cloud agent VM (it cannot provision or hold these secrets).

**Approved envelope:** Option A · `us-east-1` · hostname `np-institutional.abraxasworld.xyz` · **~$27–34/mo** indicative · **$50/mo founder ceiling** · Demo **OUT** · Production **OUT** · worker **`d10bf66f`**.

**Completion standard:** After you finish this handoff, run Phase 3–4 live tests and attach redacted logs. **Operational GO** only when live evidence passes. AWS Budgets **alert**; they do not hard-stop spend.

---

## Before you start

1. Sign in to the **correct** AWS account (not Production Abraxas data).  
2. Create an AWS Budget at **$50/month** with alerts at 80% and 100%.  
3. Have DNS access to change **only** the `np-institutional` label.  
4. Plan **two workstations/paths:** **signing VM** (worker + runtime DB role) and **governance operator** (governance DB login only — can be your laptop with VPN/SSH tunnel to Postgres on the VM, but **never** copy governance DSN onto the worker).

**Resource naming (use consistently):**

| Kind | Name / tag |
|------|------------|
| Project tag | `Project=abraxas-np-institutional-1` |
| Environment tag | `Environment=nonprod` |
| EC2 Name | `abraxas-np-institutional-1` |
| Security group | `abraxas-np-institutional-sg` |
| KMS issuer key alias | `alias/abraxas-np-issuer` |
| KMS status key alias | `alias/abraxas-np-status` |
| IAM user (issuer) | `abraxas-np-kms-issuer` |
| IAM user (status) | `abraxas-np-kms-status` |

---

## Part 1 — AWS Console: KMS (two non-exportable keys)

**Goal:** Two **asymmetric signing** keys; private material never leaves AWS.

1. Open **KMS** → **Customer managed keys** → **Create key**.  
2. **Key type:** Asymmetric. **Key usage:** Sign and verify.  
3. **Key spec:** **ECC\_EDWARDS25519** (Ed25519).  
4. **Key material origin:** KMS (not EXTERNAL).  
5. Create key; set alias **`alias/abraxas-np-issuer`**. Tags: `Project=abraxas-np-institutional-1`.  
6. Repeat for second key → alias **`alias/abraxas-np-status`**.  
7. Copy each key **ARN** (you will need them for IAM policies).

**IAM — issuer user `abraxas-np-kms-issuer`:**

1. IAM → Users → Create user (programmatic access only).  
2. Attach **inline policy** (replace `ISSUER_KEY_ARN`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "IssuerSignOwnKey",
      "Effect": "Allow",
      "Action": ["kms:Sign", "kms:GetPublicKey", "kms:DescribeKey"],
      "Resource": "ISSUER_KEY_ARN"
    },
    {
      "Sid": "DenyStatusKey",
      "Effect": "Deny",
      "Action": "kms:Sign",
      "Resource": "STATUS_KEY_ARN"
    }
  ]
}
```

3. Create access key; store in a password manager (you will put it only in `/etc/abraxas/institutional-worker.env` on the VM).

**IAM — status user `abraxas-np-kms-status`:** Same pattern with Allow on `STATUS_KEY_ARN` and Deny `Sign` on `ISSUER_KEY_ARN`.

---

## Part 2 — AWS Console: EC2, network, Elastic IP

**Goal:** One small Linux server; **443** from internet; **3848 not public**; SSH from your IP only.

### Security group `abraxas-np-institutional-sg`

| Rule | Type | Port | Source | Purpose |
|------|------|------|--------|---------|
| Inbound | HTTPS | 443 | `0.0.0.0/0` (or your institution CIDR) | TLS ingress |
| Inbound | SSH | 22 | **Your admin IP/32** | Break-glass admin |
| Inbound | Custom TCP | 3848 | — | **Do not add** |
| Outbound | All | All | `0.0.0.0/0` | Updates, KMS API |

### Launch instance

1. **AMI:** Ubuntu Server 24.04 LTS.  
2. **Instance type:** `t3.small`.  
3. **Storage:** 30 GiB **gp3**, encrypted (default AWS KMS key is fine).  
4. **Network:** Default VPC or approved VPC; **Auto-assign public IP** enabled **or** attach Elastic IP in next step.  
5. **Security group:** `abraxas-np-institutional-sg`.  
6. **Tags:** `Name=abraxas-np-institutional-1`, `Project=abraxas-np-institutional-1`, `Environment=nonprod`.  
7. Launch; note **instance id**.

### Elastic IP

1. EC2 → Elastic IPs → Allocate.  
2. Associate with `abraxas-np-institutional-1`.  
3. Record **Elastic IP** (this is the DNS target for `np-institutional`).

**Monthly cost reminder:** In-use public IPv4 is about **$0.005/hour** (~**$3.65/mo**) in addition to instance and EBS.

### Optional: EBS snapshot schedule

1. Data Lifecycle Manager or weekly manual snapshot of root volume (~**$1.50/mo** per 30 GiB retained).  
2. Stay within **$50** ceiling — avoid extra volumes, NAT Gateway, or ALB.

---

## Part 3 — On the VM: base software

SSH as `ubuntu` (or your admin user). **Do not paste secrets into shell history** — use files with mode `600`.

```bash
sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-client-16 caddy git curl
sudo systemctl enable postgresql
```

### Postgres (local sovereign DB on VM)

```bash
sudo -u postgres psql -c "CREATE USER abraxas_admin WITH PASSWORD 'CHOOSE_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE abraxas_sovereign_staging OWNER abraxas_admin;"
```

Keep `CHOOSE_STRONG_PASSWORD` in your password manager only.

### Clone worker at accepted commit

```bash
sudo mkdir -p /opt/abraxas
sudo chown ubuntu:ubuntu /opt/abraxas
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git /opt/abraxas/app
cd /opt/abraxas/app
git checkout d10bf66f6982a735d8091490e78bef2ef775f3ab
npm ci
```

---

## Part 4 — Database: migrations through 012

**Admin connection** (replace password and host):

```bash
export ADMIN_URL="postgresql://abraxas_admin:CHOOSE_STRONG_PASSWORD@127.0.0.1:5432/abraxas_sovereign_staging"
```

Apply migrations **in numeric order**:

```bash
cd /opt/abraxas/app
for n in $(ls database/sovereign/migrations/*.sql | sort); do
  echo "Applying $n"
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -f "$n"
done
```

Migration **012** creates roles `abraxas_runtime` and `abraxas_governance_operator`. Next, create **role passwords** and URLs (operator-generated; never commit):

1. On admin connection, set login passwords for `abraxas_runtime` and `abraxas_governance_operator`.  
2. Build:
   - **Runtime URL** → `ABRAXAS_SOVEREIGN_STAGING_PG_URL` (worker only).  
   - **Governance URL** → `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL` (**operator laptop or separate session only — never on worker**).

Governance trust pin ceremony follows the disposable contract exercised in tests (`governanceOperatorIsolation.test.ts`, `governanceTrustCeremony.ts`). Run ceremony steps from an operator Node environment with **only** governance + admin URLs set — not on the worker host if that would place governance credentials on the signing machine. Practical minimum for first activation: provision roles and pin using the same patterns as integration tests, documented in BUILD #956 handoff.

---

## Part 5 — Worker install (loopback only)

Create environment file (root-owned, **no governance DSN**):

```bash
sudo mkdir -p /etc/abraxas
sudo chmod 700 /etc/abraxas
sudo nano /etc/abraxas/institutional-worker.env
sudo chmod 600 /etc/abraxas/institutional-worker.env
```

**Required keys (values only on VM):**

```bash
ABRAXAS_INSTITUTIONAL_SIGNING_WORKER=1
ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT=demo
ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST=127.0.0.1
ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_PORT=3848
ABRAXAS_WORKER_CALLER_STATUS_SCOPE=institution_wide
ABRAXAS_WORKER_CALLER_STATUS_SECRET=<random-1>
ABRAXAS_WORKER_CALLER_ISSUER_SECRET=<random-2>
ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET=<random-3>
ABRAXAS_WORKER_CALLER_HEALTH_SECRET=<random-4>
ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID=abraxas-np-anchor
ABRAXAS_STATUS_SIGNER_KEY_ID=abraxas-np-status
ABRAXAS_AWS_KMS_REGION=us-east-1
ABRAXAS_AWS_KMS_ISSUER_KEY_ID=<issuer-key-id-or-arn>
ABRAXAS_AWS_KMS_STATUS_KEY_ID=<status-key-id-or-arn>
ABRAXAS_AWS_KMS_ISSUER_IDENTITY=abraxas-np-issuer
ABRAXAS_AWS_KMS_STATUS_IDENTITY=abraxas-np-status
ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID=<from IAM user issuer>
ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY=<from IAM user issuer>
ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID=<from IAM user status>
ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY=<from IAM user status>
ABRAXAS_SOVEREIGN_ENV_CLASS=staging
ABRAXAS_SOVEREIGN_STAGING_PG_URL=postgresql://abraxas_runtime:<pwd>@127.0.0.1:5432/abraxas_sovereign_staging
ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
```

**Must be absent on worker:** `ABRAXAS_GOVERNANCE_OPERATOR_PG_URL`, `ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY`, private JWK env vars, `VERCEL*`.

**systemd unit** `/etc/systemd/system/abraxas-institutional-worker.service`:

```ini
[Unit]
Description=Abraxas institutional signing worker
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/abraxas/app
EnvironmentFile=/etc/abraxas/institutional-worker.env
ExecStart=/usr/bin/npm run operator:institutional-signing-worker
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now abraxas-institutional-worker
sudo ss -tlnp | grep 3848   # expect 127.0.0.1:3848 only
```

---

## Part 6 — Caddy: TLS on 443 → loopback worker

`/etc/caddy/Caddyfile` (after DNS points to this VM — Part 7):

```caddy
np-institutional.abraxasworld.xyz {
    reverse_proxy 127.0.0.1:3848
}
```

Caddy obtains Let's Encrypt certificates automatically when port 443 is reachable and DNS is correct.

```bash
sudo systemctl enable --now caddy
```

**Smoke test (from your laptop):**

```bash
curl -sS -X POST "https://np-institutional.abraxasworld.xyz/v1/health" \
  -H "authorization: Bearer <ABRAXAS_WORKER_CALLER_HEALTH_SECRET>" \
  -H "content-type: application/json" \
  -d '{}'
```

**Negative tests:**

```bash
# Wrong bearer → 401
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://np-institutional.abraxasworld.xyz/v1/health" \
  -H "authorization: Bearer wrong" -H "content-type: application/json" -d '{}'

# Direct public IP on 3848 → must fail (timeout/refused)
curl -sS --connect-timeout 3 "http://<ELASTIC_IP>:3848/v1/health" || echo "expected_failure"
```

---

## Part 7 — DNS (Production-safe)

**Change only** the institutional non-prod host:

| Hostname | Action |
|----------|--------|
| `np-institutional.abraxasworld.xyz` | **A record** → **Elastic IP** |
| `abraxasworld.xyz` (apex) | **No change** |
| `www.abraxasworld.xyz` | **No change** |
| `demo.abraxasworld.xyz` | **No change** |

In your DNS provider (Route 53, Cloudflare, etc.), edit **only** `np-institutional`. If it currently points at Vercel, replace with the EC2 Elastic IP.

After change, verify Production names still resolve as before, then enable Caddy (Part 6).

---

## Part 8 — Secrets without Cursor or GitHub

| Secret | Where it lives |
|--------|----------------|
| KMS access keys | `/etc/abraxas/institutional-worker.env` on VM only |
| Worker caller secrets | Same file |
| Postgres runtime password | Same file (runtime URL) |
| Postgres governance password | Operator password manager + governance URL **only** on operator machine |
| Admin/bootstrap DB password | Password manager; used once for migrations |

- `chmod 600` on env files; never commit; never paste into Cursor chat or GitHub issues.  
- Optional: Cursor Secrets for **orchestration** — values still originate on your AWS/DNS workflow; the agent VM does not need them for provisioning.

---

## Part 9 — Phase 3 live acceptance commands

Run on the **VM** (KMS + worker) with env loaded from `/etc/abraxas/institutional-worker.env`:

```bash
cd /opt/abraxas/app
set -a && source /etc/abraxas/institutional-worker.env && set +a
export ABRAXAS_AWS_KMS_SIGNING_TEST=1
npx vitest run lib/institutional/signing/institutionalSigner.aws.integration.test.ts
```

Run against **staging URLs** (set sovereign + governance URLs for tests — governance on operator session only):

```bash
export ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1
# Operator session: include GOVERNANCE_OPERATOR_PG_URL
npx vitest run lib/persistence/boundary/issuerAuthority/governanceOperatorIsolation.test.ts
npx vitest run lib/institutional/signing/recordedWorkflow.integration.test.ts
```

**Independent verifier (off-host):** On a **different** machine (laptop/CI), install repo or `@abraxas/independent-verifier` only; verify exported receipt/status JSON with **no** KMS or DB secrets.

Repo preflight on VM after install:

```bash
/opt/abraxas/app/scripts/operations/np-institutional-1-preflight.sh
```

(Install `aws` CLI on VM only if you want identity check; not required for worker.)

---

## Part 10 — Rollback and cleanup

If you need to tear down the stack:

1. **DNS:** Remove or revert `np-institutional` A record (do not touch apex/www/demo).  
2. **Stop services:** `sudo systemctl stop abraxas-institutional-worker caddy`.  
3. **EC2:** Terminate instance `abraxas-np-institutional-1`.  
4. **Elastic IP:** Release if not needed.  
5. **KMS:** Schedule key deletion (7-day waiting period) for both aliases.  
6. **IAM:** Delete access keys and users `abraxas-np-kms-issuer`, `abraxas-np-kms-status`.  
7. **Snapshots:** Delete EBS snapshots created for this project.  
8. **Budget:** Disable or delete test budget if decommissioning.

---

## Phase 4 — When to call Cursor back

After provisioning, run Parts 9 tests and collect **redacted** logs:

- TLS health 200 / wrong bearer 401  
- Port 3848 closed from internet  
- KMS live test pass (cross-key denial + verifier accept)  
- Governance isolation on staging DB  
- Independent verifier output from non-worker host  

Paste those artifacts (no secrets) into a new Cursor run for **Phases 3–4 attestation**. **Do not** declare operational GO until all are pass.

---

## Reference docs (no new engineering)

- Envelope: `docs/operations/BUILD_959_SOVEREIGN_NP_ACTIVATION.md`  
- Cost / preflight: `docs/operations/BUILD_959_PHASE2_PREFLIGHT_RESULT.md`  
- Software pin: `d10bf66f` on branch `cursor/institutional-signing-integration-56a9` (PR #951)
