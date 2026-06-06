-- RLS FIX for tokenization_requests
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query → Run)
-- This fixes "new row violates row-level security policy" on INSERT.
--
-- Root cause: Supabase RLS policies alone don't work without explicit
-- table-level GRANT statements on the schema + table for the anon role.
-- Even with a permissive policy, if anon has no INSERT privilege, it fails.

-- ── Step 1: Grant schema + table privileges to anon ─────────────────
grant usage on schema public to anon, authenticated;

grant insert
  on public.tokenization_requests
  to anon, authenticated;

-- Only allow updating specific columns (tx_signature, status)
-- so anon can confirm payment but not alter business_name, tier, etc.
grant update (tx_signature, status, updated_at)
  on public.tokenization_requests
  to anon, authenticated;

-- ── Step 2: Drop old policies (recreate cleanly) ────────────────────
drop policy if exists "anon can insert requests"  on public.tokenization_requests;
drop policy if exists "anon can update pending"   on public.tokenization_requests;
drop policy if exists "anon_insert"               on public.tokenization_requests;
drop policy if exists "anon_update_pending"       on public.tokenization_requests;

-- ── Step 3: New INSERT policy — with check (true) ───────────────────
-- No row-level check needed: the app controls what gets inserted.
-- Status default + column check constraint still enforces valid values.
create policy "anon_insert"
  on public.tokenization_requests
  for insert
  to anon, authenticated
  with check (true);

-- ── Step 4: UPDATE policy — only pending_payment rows ───────────────
-- Anon can flip status from pending_payment → paid and add a tx_signature.
-- Cannot touch already-paid or fulfilled rows.
create policy "anon_update_pending"
  on public.tokenization_requests
  for update
  to anon, authenticated
  using  (status = 'pending_payment')
  with check (status in ('pending_payment', 'paid'));

-- ── Verify ──────────────────────────────────────────────────────────
select
  schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where tablename = 'tokenization_requests'
order by cmd, policyname;
