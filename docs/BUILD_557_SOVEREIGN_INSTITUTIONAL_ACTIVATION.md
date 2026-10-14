# Build #557 — Sovereign institutional activation

Turns the Build #556 **certified** sovereign runtime into the smallest **reproducible** Abraxas-operated deployment model (PostgreSQL + encrypted evidence + keys + backup), without Supabase as an identity intermediary.

## 1. Independent deployment architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Abraxas Passport API (Next.js / Vercel or self-hosted)        │
│  ABRAXAS_PERSISTENCE_BACKEND=postgres_direct                  │
│  Wallet auth · IDV · credentials · partner policy · receipts   │
└────────────┬───────────────────────────────┬─────────────────┘
             │ wire-protocol SQL               │ filesystem
             ▼                                 ▼
┌────────────────────────────┐    ┌─────────────────────────────┐
│ Abraxas PostgreSQL 16+      │    │ ABRAXAS_EVIDENCE_STORAGE_ROOT│
│ SOVEREIGN_RUNTIME_SCHEMA    │    │ AES-256-GCM evidence blobs   │
│ manifest (portable SQL)     │    │ (custody rows in PG)         │
└────────────┬───────────────┘    └─────────────────────────────┘
             │
             ▼
┌────────────────────────────┐
│ Build #552 backup runner    │
│ pg_dump → AES-GCM + manifest│
│ ABRAXAS_BACKUP_SCOPE=sovereign│
└────────────────────────────┘
```

**Reproduce locally (disposable):**

```bash
docker compose -f docker-compose.sovereign.yml up -d
cp .env.sovereign.institutional.example .env.local
# fill keys (openssl rand -base64 32)
export ABRAXAS_DATABASE_URL=postgresql://abraxas:…@127.0.0.1:5432/abraxas_sovereign
npm run sovereign-runtime:activate-557
```

**Schema:** `npm run sovereign-idv:apply-schema` applies `SOVEREIGN_RUNTIME_SCHEMA_MANIFEST`.

## 2. Sovereign HTTP certification (Build #556 baseline)

| Stage | Evidence |
|-------|----------|
| EVM / Solana wallet auth | `build556.sovereignCertification.test.ts` |
| Passport capture + consent + custody | same + `idvLifecycle.sovereign.test.ts` |
| Pending review → atomic approve (synthetic) | `build555Security.adversarial.test.ts` |
| Revocation / policy claim filter | adversarial suite |
| Signed receipt independent verify | `verifyReceiptIndependently` (offline phases) |
| Admin HTTP gates | production PIN / allowlist checks in build556 |
| Replay / concurrency | build555 security + holder subject concurrency |

**Labeling:** All automated IDV approval in certification uses **synthetic fixtures** — not human Production verification.

## 3. Security and recovery

| Control | Mechanism |
|---------|-----------|
| Tenant / holder isolation | Evidence custody holder binding; cross-holder read denied |
| Issuer authority | `ABRAXAS_SIGNING_KEY` + verification key registry (receipts) |
| Key rotation | Operational — rotate signing JWK + registry; separate evidence/backup keys |
| Revocation / freshness | Claim status + policy authorization filters (direct PG) |
| Policy / audience binding | Partner policy rows + receipt expectations (offline verify) |
| Replay protection | Auth challenge consume; receipt consumption tests in CI |
| DB connection security | `pgPool` TLS defaults, bounded pool (`BUILD_553`) |
| Evidence encryption | `ABRAXAS_EVIDENCE_ENCRYPTION_KEY` required at rest |
| Recovery | Build #552 encrypted backup + observed restore (`sovereignBackupRestore.test.ts`) |

## 4. Founder provisioning requirements (exact)

1. **PostgreSQL 16+** (managed or self-hosted) with TLS, dedicated role, no public `anon` grants on sovereign tables.
2. **`ABRAXAS_DATABASE_URL`** — app + backup source (sovereign scope).
3. **`ABRAXAS_EVIDENCE_STORAGE_ROOT`** — private encrypted volume (NFS/block/object mount); backup **with** custody metadata.
4. **`ABRAXAS_EVIDENCE_ENCRYPTION_KEY`** — 32-byte random, base64; **separate** from backup key.
5. **`ABRAXAS_SIGNING_KEY`** — Ed25519 private JWK; HSM/KMS custody for Production.
6. **`ABRAXAS_BACKUP_ENCRYPTION_KEY`** + offsite storage for `.enc` + manifest; quarterly restore to **`ABRAXAS_SOVEREIGN_RESTORE_PG_URL`**.
7. **Monitoring:** Postgres connectivity, pool saturation, backup job success, evidence disk usage, failed admin auth.
8. **Cutover:** `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` on identity-facing deployment; omit Supabase service role on those services.
9. **Apply schema** once per environment: `npm run sovereign-idv:apply-schema`.
10. **Activation gate:** `npm run sovereign-runtime:activate-557` (env validate + schema + certify + disposable proof).

Template: `.env.sovereign.institutional.example`

## 5. Remaining institutional blockers

| Blocker | Notes |
|---------|--------|
| **Production hosting** | Founder must bind env to Abraxas-operated PG + evidence volume (not disposable localhost). |
| **Legacy zkLogin** | Still uses PostgREST paths until retired; not required for EVM/Solana sovereign passport. |
| **Human IDV in Production** | Requires real reviewer process + ops — not simulated by activation scripts. |
| **Mainnet / Production chain** | Out of scope; devnet/Sepolia used in certification only. |

## 6. Commands

```bash
npm run test:sovereign-runtime
npm run test:sovereign-certification
npm run sovereign-runtime:activate-557
npm run build
```
