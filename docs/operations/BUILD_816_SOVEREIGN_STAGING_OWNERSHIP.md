# Build #816 — Sovereign staging operational ownership

**Baseline:** PR **#815 merged** — CI `sovereign-operational-proof` green (14/14 on #815 run).

## 1. PR #815 merge & CI

| Item | Status |
|------|--------|
| PR #815 | **Merged** to `main` |
| `sovereign-operational-proof` | **Passed** on #815 Actions run |
| Local re-verify | `ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1` integration tests |

## 2. External staging deployment

| Status | Detail |
|--------|--------|
| **Pending** | No founder-attested external host in this build |

CI/disposable Postgres remains the **executed** proof. External deployment requires `ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED` + `ABRAXAS_STAGING_HTTP_BASE_URL` after operator drill on real infrastructure.

Contract: `docs/operations/SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md`  
Compose (local only): `docker/sovereign-staging/docker-compose.yml`

## 3. Administrative ownership verification

Machine-readable checklist: `lib/persistence/boundary/staging/stagingOperationalOwnership.ts`  
CLI: `npx tsx scripts/sovereign/validate-staging-ownership.ts` (redacted, exit 1 if checks fail)

## 4. Staging schema & isolation

- Slice schema: `lib/persistence/boundary/sovereignSlice/schema.sql` (synthetic only)
- Isolation: Production Supabase ref blocked; distinct restore endpoint; no Supabase env on sovereign path

## 5. Backup & restoration evidence

| Capability | Build #816 addition |
|------------|---------------------|
| Logical backup | #815 |
| **AES-256-GCM encrypted backup** | `encryptedBackup.ts` (Abraxas key custody) |
| RPO/RTO observation | `recoveryMetrics.ts` + integration test |
| Tamper | Digest + GCM auth tag rejection |

## 6. Revocation & issuer authority

- Revoked receipt / expired / cross-tenant: #815 + extended tests  
- **Issuer key revoked after restore:** signature authentic, **currently acceptable false** (`issuer_not_authorized`)  
- **Policy:** Backups do not restore trust after key compromise — operators must revoke + rotate keys explicitly (`issuerTrustRecovery.ts`)

## 7. Measured recovery (CI disposable drill)

Observed in integration test (order of magnitude, not Production SLO):

- **RTO:** export → encrypted restore → reconcile completes in **&lt; 60s** on CI Postgres  
- **RPO bound:** time from last fixture write to export completion **&lt; 60s** in drill  

Not a Production commitment — staging-class measurement only.

## 8. Remaining operational dependencies

| Independent today | Still legacy (Production) |
|-------------------|---------------------------|
| Slice read/freshness on direct PG | ~450 PostgREST call sites |
| Encrypted slice backup/restore | Supersession, claims, launchpad context in `evaluateReceiptCurrentValidity` |
| Offline Ed25519 verify | Issuer registry publication to verifiers |

## 9. Smallest next engineering change

**Issuer authority & key lifecycle on sovereign slice** — extend boundary read path for verification key registry + documented rotation, then migrate **revocation/current validity** reads (not mass rewrite).

## 10. Approval gates before provisioning

Founder/operator explicit approval required for:

- Paid cloud / VM provisioning  
- TLS certificates and public DNS for staging API  
- Copying any Production-derived rows  
- Production read shadow or writer cutover  

## Production restrictions

Unchanged — no Production SQL, cutover, native auth, live keys, billing.
