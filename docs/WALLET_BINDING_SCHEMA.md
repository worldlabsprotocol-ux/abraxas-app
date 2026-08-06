# Wallet binding schema preflight

Production wallet binding requires the **036 connect** shape of `wallet_binding_challenges`. Deployments that applied only migration **020** have a legacy table (`challenge_id` PK, no `chain` column), which causes PostgREST errors such as:

> Could not find the 'chain' column of 'wallet_binding_challenges' in the schema cache.

## Read-only preflight

```bash
# Local / CI (no Supabase credentials required)
npm run wallet-binding:verify-schema

# Against production (read-only service role)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm run wallet-binding:verify-schema
```

Or run this SQL in the Supabase SQL editor:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'wallet_binding_challenges'
order by ordinal_position;
```

**Compatible** when columns include: `id`, `wallet_address`, `chain`, `message`, `domain`, `expires_at`.

## Fix

Apply migration:

`supabase/migrations/057_wallet_binding_challenges_connect.sql`

This migration:

1. Renames `challenge_id` → `id` when the 020 PK is still present.
2. Adds `chain`, `domain`, `subject_id`, and `chain_id` if missing.
3. Backfills `chain = 'sui'` and `domain` for legacy rows.

After applying, refresh the Supabase schema cache (Dashboard → Settings → API → Reload schema, or wait for automatic refresh).

Wallet binding remains **optional** — verified identity credentials work without it.
