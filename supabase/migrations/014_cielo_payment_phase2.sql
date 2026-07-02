-- FILE: supabase/migrations/014_cielo_payment_phase2.sql
-- Phase 2: on-chain payment tracking for Cielo bookings

alter table public.stay_requests
  add column if not exists payment_tx_digest text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists treasury_address text,
  add column if not exists paid_amount_usdc numeric;

create index if not exists stay_requests_payment_tx_idx
  on public.stay_requests (payment_tx_digest)
  where payment_tx_digest is not null;
