-- FILE: supabase/migrations/012_stay_requests_sui.sql
-- Sui stablecoin booking metadata for Cielo stay_requests

alter table public.stay_requests
  add column if not exists payment_chain text default 'sui',
  add column if not exists payment_asset text default 'USDC',
  add column if not exists sui_address text;
