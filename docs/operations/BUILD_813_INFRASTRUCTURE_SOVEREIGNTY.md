# Build #813 — Infrastructure sovereignty (Production)

**Founder decision (2026-10-24):** Stop Supabase Production expansions **058/065**. Preserve running Production. Move toward **Abraxas-operated PostgreSQL** (open standard) with Abraxas-controlled backups, keys, and migrations — not another managed SaaS rename.

Sandbox acceptance **closed** (`dr_jSXuDfM_pFMT36du`, one metering row on Demo). Trust behavior unchanged after migration.

---

## 1. Current authoritative dependencies

| Layer | What Production uses today | Classification |
|-------|------------------------------|----------------|
| **Cryptographic trust** | Ed25519 receipt signing (`ABRAXAS_SIGNING_KEY`), public verify APIs | **Abraxas-native** — offline signature verify |
| **Freshness / revocation** | `decision_receipts`, partners, revocation control plane | **Authoritative operational state** — requires live Postgres (today via PostgREST → Supabase-hosted PG) |
| **Partner flow** | Policies, decisions, idempotency, session reuse | **Authoritative** — same transport |
| **Holder auth (live)** | Passport / zkLogin / browser sessions | **Operational** — PostgREST |
| **Native accounts (code)** | WebAuthn + Solana paths | **Implemented** — schema **not** on Production PG; flag **off** |
| **Persistence transport** | Default `supabase_postgrest` (`requirePersistenceAdmin`) | **Replaceable** — same SQL, different wire |
| **Direct PG (partial)** | `ABRAXAS_PASSPORT_TRANSACTION_PG`, `postgresDirectStore`, `ABRAXAS_DATABASE_URL` | **Abraxas-native path** — not default Production |
| **Metering (Demo only table)** | `partner_metering_events` on Demo | **Observe-only**; Production table **absent**; **058 suspended** |
| **Object storage / IDV** | Veriff, document routes | **External** — evidence, not protocol root |

Inventory source: `lib/infrastructure/trustBoundaryInventory.ts` (+ ~450 call sites using `@supabase/supabase-js` / `requireSupabaseAdmin`).

---

## 2. Supabase-specific components to replace (transport & ops, not crypto)

| Component | Replace with |
|-----------|----------------|
| Supabase PostgREST as **default** admin client | `postgres_direct` pool (`lib/persistence/pgPool.ts`) + typed repositories |
| Supabase dashboard backups/PITR as **sole** recovery story | Abraxas-operated backup/restore runbooks on chosen Postgres |
| Supabase `schema_migrations` ledger for operator DDL | Abraxas-controlled migration runner + version table |
| Service-role key via Supabase project | Abraxas-managed DB role credentials (rotation documented) |
| Demo/Prod coupling in operator habit | Explicit environment binding (`ABRAXAS_DATABASE_URL`, no implicit project) |

**Not replaced:** PostgreSQL as engine; Ed25519 math; receipt byte formats; wallet adapters.

---

## 3. Abraxas-native components to retain

- Receipt signing and **independent verification** (`verifyReceiptIndependently`, public JWK)
- Partner flow logic, session reuse, idempotency (`relyingPartyFlow`, `sessionDecision`)
- `TRUST_BOUNDARY_DEPENDENCIES` / offline verification contract
- `postgresDirectStore`, native account schema (migrations 144–147) for **future** sovereign host
- Commercial metering **logic** (idempotent keys) — durable store follows sovereignty phase 1
- Protocol independence standard: `docs/protocol/PROTOCOL_INDEPENDENCE_STANDARD.md`

---

## 4. Target Production infrastructure

```
Holder wallet → Abraxas protocol (evaluate, sign) → portable receipt → relying app verifies
                      ↓
        Abraxas-operated PostgreSQL (schema + migrations + backups)
                      ↓
        Optional: PostgREST or app-side SQL — both Abraxas-controlled
```

**Controls Abraxas must own:** schema, migrations, DB roles, signing keys, backup/restore tests, audit retention, metering ledger, revocation/status tables, partner/tenant rows.

**Provider failure test:** verifier validates signature without DB; freshness/revocation per policy when status service unavailable.

---

## 5. Data and credential migration requirements

- **Receipt bytes & issuer keys:** migrate registry + keys; **no re-signing** historical receipts
- **Revocation / supersession history:** copy or replay into new store; verify hash parity
- **Partner, policy, API keys:** tenant-scoped export/import; validate FK order
- **Consent & audit:** append-only; preserve timestamps
- **Idempotency keys:** preserve uniqueness constraints
- **Metering:** empty on Production today — first row only after sovereign ledger + real issuance
- **Credentials:** no Demo `abx_*` promotion; new Production keys after promotion RPC
- **Cutover:** single authoritative writer; shadow-read validation; **no unsafe dual-write**

---

## 6. Security and recovery risks

| Risk | Mitigation |
|------|------------|
| Cutover data loss | Backup + restore drill **before** writer switch |
| Split-brain issuance | One writer; freeze issuance during cutover window |
| Revocation stale after migration | Reconciliation job + spot-check `currently_valid` |
| Key compromise | Issuer rotation procedure independent of Supabase |
| False sovereignty (managed PG elsewhere) | Same independence tests on **who administers** DB |
| Routine DDL on Supabase while planning exit | **058/065 suspended** (`productionChangeControl.ts`) |

**Rollback:** Vercel redeploy + feature flags; **do not drop** native-account or receipt tables as routine rollback — preserve audit history.

---

## 7. Smallest executable phases

| Phase | Work | Production impact |
|-------|------|-------------------|
| **0 (now)** | Protocol standard + inventory + suspend 058/065 | None |
| **1** | Abraxas-operated Postgres **staging**; `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` for **non-holder** read/write shadow | None on prod traffic |
| **2** | Backup/restore proof; migration runner; replicate **metering** schema on sovereign PG | Still no Prod cutover |
| **3** | Shadow-read receipt validity + partner row counts vs Supabase | None |
| **4** | Controlled cutover (maintenance window); keep Supabase read-only archive until validated | Planned downtime / fail-closed |
| **5** | Native accounts 144–147 on **sovereign** PG only; then `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` | Separate approval |
| **6** | New Production institutional app + genuine acceptance + one metering row | Separate approval |

---

## 8. First focused PR (this build)

- `docs/protocol/PROTOCOL_INDEPENDENCE_STANDARD.md`
- `docs/operations/BUILD_813_INFRASTRUCTURE_SOVEREIGNTY.md` (this file)
- `lib/infrastructure/productionChangeControl.ts` + tests (058/065 **suspended**)
- `trustBoundaryInventory` metering entry
- `BUILD_812_METERING_PREFLIGHT.md` status → **suspended**

**Acceptance tests:** `productionChangeControl.test.ts`, existing `infrastructureIndependence.test.ts` / `trustBoundaryInventory` tests.

---

## 9. Production cutover authorization gates

1. Founder: sovereign Postgres **hosting** choice + admin ownership documented  
2. Operator: **restore drill passed** (not dashboard assumption)  
3. Founder: **single-writer cutover** window approved  
4. Engineering: shadow-read parity report signed  
5. Separate: native auth flag, live keys, institutional app, billing  

**Explicitly not authorized:** Supabase **058/065**, Demo tenant promotion, synthetic Production receipts, billing activation.
