# Build #515 — Demo migration recovery plan (134–138)

## Verified Demo state (read-only)

- **Project:** `ocntwbxarpjeixdnzide` (production `bztwutzprwsdrtqdpymf` is off limits)
- **History:** newest `schema_migrations.name` = `087_stocklana_pilot` (duplicate `086_*` rows also recorded)
- **Catalog:** ~65 public tables; core partner/IDV/receipt prerequisites **present**
- **Missing:** all Solana-native objects from migrations **134–138** (see `docs/BUILD_515_DEMO_LIVE_PROBE.json`)

Migration history is **not authoritative** on Demo. Do **not** replay migrations **088–133** merely because history stops at 087.

## Minimal safe sequence (Demo catch-up)

Apply **only** when live probes show prerequisites and **zero** Solana objects (no partial state):

1. `134_holder_wallet_login.sql` — wallet tables; needs `pgcrypto` (already on Demo)
2. `135_canonical_holder_accounts.sql` — needs `holder_wallet_accounts`
3. `136_cielo_verified_guest_solana_policy.sql` — needs `partner_policies`
4. `137_good_trouble_age_21_solana_idv.sql` — needs `holder_accounts`, `identity_verifications`, `partner_policies`
5. `138_decision_receipt_solana_commitments.sql` — needs `decision_receipts`

Static SQL audit (DROP/TRUNCATE): **PASS** for 134–138 (offline).

## Operator authorization gate

Remote apply requires **explicit founder authorization** after reviewing this plan.

```bash
export DEMO_SUPABASE_PROJECT_REF=ocntwbxarpjeixdnzide
export PRODUCTION_SUPABASE_PROJECT_REF=bztwutzprwsdrtqdpymf
export NEXT_PUBLIC_SUPABASE_URL=https://ocntwbxarpjeixdnzide.supabase.co
# DEMO_SUPABASE_DATABASE_URL=<session pooler or direct URL — never production>

# Dry run (offline config + file audit)
npm run demo:solana-incremental-migrate

# Apply (only after authorization)
npm run demo:solana-incremental-migrate -- --apply --confirm=ocntwbxarpjeixdnzide
```

## Post-migration validation SQL

Run in Supabase SQL editor (read-only checks):

```sql
SELECT to_regclass('public.holder_wallet_accounts') IS NOT NULL;
SELECT to_regclass('public.holder_accounts') IS NOT NULL;
SELECT column_name FROM information_schema.columns
  WHERE table_name='identity_verifications' AND column_name='holder_account_id';
SELECT id FROM public.partner_policies
  WHERE id IN ('cielo-verified-guest-solana-v1','good-trouble-age_21_retail-solana-v1');
SELECT to_regclass('public.decision_receipt_solana_commitments') IS NOT NULL;
```

Then: `npm run release-gate:build515` with Demo env (no secrets printed).

## Rollback limitations

- Migrations use `CREATE IF NOT EXISTS` and policy upserts — **no automated down migration**
- Rollback is forward repair or restore from Supabase backup — not `DROP` scripts in repo
- Partial apply leaves **blocked_partial_solana** until operator reconciles

## Disposable database dry run

Agent VM: **BLOCKED** (no authorized Demo DB URL / no local Postgres fixture in CI).

Offline substitutes executed in CI:

- `npm run audit:migrations:build515` — graph + static SQL audit
- `lib/release/*` unit tests — readiness and gate logic

## Remaining blockers after migration

- Vercel deployment protection (403 on automated fetch)
- Live Phantom + Veriff E2E (founder-operated)
- Solana committer devnet funding / signing env on Demo deployment
