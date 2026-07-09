-- ================================================================
-- ABRAXAS — PHASE 2 SQL (run after the main setup script)
-- Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run
-- ================================================================

alter table public.stay_requests
  add column if not exists payment_tx_digest text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists treasury_address text,
  add column if not exists paid_amount_usdc numeric;

create index if not exists stay_requests_payment_tx_idx
  on public.stay_requests (payment_tx_digest)
  where payment_tx_digest is not null;

-- Verify
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stay_requests'
  and column_name in ('payment_tx_digest', 'payment_verified_at', 'treasury_address', 'paid_amount_usdc')
order by column_name;
