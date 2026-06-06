-- ================================================================
-- Abraxas Protocol — tokenization_requests RLS fix
-- Paste this entire block into Supabase SQL Editor → Run
-- ================================================================
--
-- WHY THIS IS NEEDED
-- ------------------
-- Supabase has two independent access layers:
--   1. Table-level privileges  (GRANT ... TO anon)
--   2. Row-level security policies (CREATE POLICY)
-- BOTH must pass for an INSERT to succeed.
-- The original migration created policies but never ran GRANT,
-- so every insert returns "row violates row-level security policy".
--

-- Step 1 ── Give the anon role privileges on the table
grant usage  on schema public                      to anon, authenticated;
grant insert on public.tokenization_requests       to anon, authenticated;
-- Only allow updating the two columns users can legitimately touch
grant update (tx_signature, status, updated_at)
             on public.tokenization_requests       to anon, authenticated;

-- Step 2 ── Drop old policies (removes duplicates / stale versions)
drop policy if exists "anon can insert requests"    on public.tokenization_requests;
drop policy if exists "anon can update pending"     on public.tokenization_requests;
drop policy if exists "anon_insert"                 on public.tokenization_requests;
drop policy if exists "anon_update_pending"         on public.tokenization_requests;

-- Step 3 ── Recreate INSERT policy
-- with check (true) ── the app enforces business logic; the column
-- constraint (status check) still prevents invalid status values.
create policy "anon_insert"
  on public.tokenization_requests
  for insert to anon, authenticated
  with check (true);

-- Step 4 ── Recreate UPDATE policy
-- Anon can flip pending_payment → paid and record a tx_signature.
-- Cannot modify already-paid or fulfilled rows.
create policy "anon_update_pending"
  on public.tokenization_requests
  for update to anon, authenticated
  using  (status = 'pending_payment')
  with check (status in ('pending_payment', 'paid'));

-- Step 5 ── Verify (should show 2 policies)
select schemaname, tablename, policyname, cmd, permissive
from   pg_policies
where  tablename = 'tokenization_requests'
order  by cmd;
