# Build #812 — Production metering preflight (058 / 065)

**Project:** `bztwutzprwsdrtqdpymf` (Production)  
**Status:** Preflight only — **no SQL executed** without founder authorization  
**Billing:** Observe-only; `enforcement_mode` default `observe` in 058

---

## Preflight result (read-only, Oct 24 2026)

| Check | Result |
|-------|--------|
| `partner_metering_events` | **Absent** (`to_regclass` null) |
| `partner_entitlements` | **Absent** |
| `partners` FK target | **Present** |
| `decision_receipts` / issuance path | **Present**; `service_role` **INSERT+SELECT** OK |
| `verification_decisions.idempotency_key` | **Present** (replay/idempotency for flow) |
| Metering idempotency (app) | `meter:pf_receipt:{receipt_id}` unique constraint in 058 |
| 065 prerequisite tables (22 audited) | **All present** except tables **created by 058** |
| Supabase `schema_migrations` ledger | Tracks numbered migrations separately; **058/065 are manual operator SQL** (same pattern as 066 promotion RPC) |
| Latest ledger entry seen | `136_zklogin_native_auth_bridge` — does not imply 058 applied |

**Conclusion:** Safe to plan **058 then conditional grants**. Full **065** block is **recommended after 058** on Production because it atomically grants `service_role` on `partner_metering_events` (and aligns with existing runtime tables). If 065 fails, use **minimal grants** in “Fallback” below.

---

## Dependency order

1. **`058_partner_metering_foundation.sql`** — creates `partner_metering_events`, `partner_entitlements`, indexes, RLS enabled (no anon/authenticated grants in file).
2. **`065_service_role_runtime_grants.sql`** — **only after 058** (065 asserts `partner_metering_events` exists).

Prerequisite: `025_partners_registry` / `partners` table (already on Production).

---

## Pre-execution checklist (operator)

- [ ] Confirm Supabase project = **Production** (`bztwutzprwsdrtqdpymf`), not Demo.
- [ ] Confirm backup / PITR / recovery contact (founder).
- [ ] Maintenance window communicated (058 is DDL-only; brief lock on new tables only).
- [ ] No native-account migrations in same window (founder: **separate stage**).
- [ ] Vercel Production on **`main`** ≥ merge **#811** (`a22f4045`).

---

## Execution plan (authorized window only)

### Step A — Apply 058

Paste and run entire file:

`supabase/migrations/058_partner_metering_foundation.sql`

### Step B — Service role grants (choose one)

**Option B1 (preferred):** Run full  
`supabase/migrations/065_service_role_runtime_grants.sql`  
(idempotent `GRANT USAGE ON SCHEMA public`; rolls back entire DO block on failure)

**Option B2 (minimal fallback if B1 blocked):**

```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.partner_metering_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_entitlements TO service_role;
REVOKE ALL ON TABLE public.partner_metering_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.partner_entitlements FROM PUBLIC, anon, authenticated;
```

### Step C — Post-migration smoke (Production)

Run in SQL editor (use a **test partner_id** that exists, or skip insert and verify schema only):

```sql
-- Schema
SELECT to_regclass('public.partner_metering_events') AS metering,
       to_regclass('public.partner_entitlements') AS entitlements;

-- Privilege
SELECT has_table_privilege('service_role', 'public.partner_metering_events', 'INSERT') AS metering_insert;

-- Idempotency constraint
SELECT conname FROM pg_constraint
 WHERE conrelid = 'public.partner_metering_events'::regclass
   AND contype = 'u';

-- Optional insert + duplicate guard (rollback if using a transaction)
-- INSERT ... idempotency_key 'meter:pf_receipt:dr_smoke_test' twice → second must fail unique
```

**Application smoke (no holder required):** trigger path that calls `recordPartnerFlowReceiptMeteringBestEffort` only fires on real approved issuance; after schema exists, next **Production** institutional issuance should persist one row (future acceptance).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Metering insert still fails after 058 | Verify B1/B2 grants; check app logs for PostgREST errors |
| 065 fails mid-block | Entire DO block rolls back; fix missing table before retry |
| Mistaken Demo project | Double-check project ref in dashboard URL |
| Enforcement accidentally enabled later | 058 default `enforcement_mode = observe`; no quota enforcement in this migration |

---

## Recovery controls

- **Application rollback:** Vercel → redeploy prior Production SHA (`c81db5f5` pre-#811 or last green).
- **Database:** **Do not drop** metering tables as routine rollback after rows exist — preserves audit/accounting history. If 058 applied in error with **zero** production rows, founder may drop empty tables in a **documented** reversal (exceptional).
- **Feature flags:** Keep `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` **off**; metering has no holder-facing flag — observe-only ledger only.

---

## Regression expectation for live integrations

058/065 add **new tables and grants only**. No alterations to `decision_receipts`, partner flow, passport, or Good Trouble tables. **Expected: no change** to current Production holder/partner behavior until a receipt is issued post-migration.

---

## Smallest approval to execute

**Single founder authorization:** “Apply **058** (+ **065** or minimal B2) on Production `bztwutzprwsdrtqdpymf` in window \<date\>.”

Native account migrations **144–147**, Production app promotion, and live key issuance remain **separate approvals**.
