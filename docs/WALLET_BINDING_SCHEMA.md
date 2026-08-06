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

**Stop and investigate** if both `id` and `challenge_id` exist — migration 057 will fail closed on this mixed shape.

## Operator steps — apply migration 057

1. **Preflight (read-only)**

   ```sql
   select to_regclass('public.wallet_binding_challenges');

   select column_name
   from information_schema.columns
   where table_schema = 'public' and table_name = 'wallet_binding_challenges'
   order by ordinal_position;
   ```

   Confirm you have either:
   - legacy shape: `challenge_id` (no `id`), or
   - compatible shape: `id` + `chain` + `domain`

   If **both** `id` and `challenge_id` exist, do not apply 057 until the schema is reconciled manually.

2. **Apply migration**

   Run the full contents of:

   `supabase/migrations/057_wallet_binding_challenges_connect.sql`

   in the Supabase SQL editor (or via your migration pipeline).

   The migration will:
   - Rename `challenge_id` → `id` on legacy tables only
   - Add `chain`, `domain`, `subject_id`, `chain_id` if missing
   - Backfill legacy rows (`chain = sui`, `domain = abraxasworld.xyz`)
   - **Fail** if any row still has null `chain` or `domain` after backfill
   - **Fail** if both `id` and `challenge_id` columns exist

   Existing challenge rows are updated in place — nothing is deleted.

3. **Post-migration verify**

   ```sql
   select id, chain, domain, subject_id
   from public.wallet_binding_challenges
   order by created_at desc
   limit 3;
   ```

4. **Refresh schema cache**

   Supabase Dashboard → Settings → API → Reload schema (or wait for automatic refresh).

5. **Runtime verify**

   ```bash
   npm run wallet-binding:verify-schema
   ```

Wallet binding remains **optional** — verified identity credentials work without it.

New runtime challenges use `resolveConnectDomain()` (canonical `abraxasworld.xyz` in production; trusted preview/local hosts when configured via env).
