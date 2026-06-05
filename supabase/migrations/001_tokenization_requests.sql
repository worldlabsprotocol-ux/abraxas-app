-- Migration: 001_tokenization_requests
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- Creates the tokenization_requests table + RLS policies.

create extension if not exists "uuid-ossp";

create table if not exists public.tokenization_requests (
  id              uuid        primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Submitter info (collected via form)
  business_name   text        not null,
  contact_email   text,
  contact_x       text,        -- X / Twitter handle (e.g. @pabloretroworld)
  sending_wallet  text,        -- their Solana wallet for token receipt

  -- Tier selection
  tier            text        not null
    check (tier in ('starter','growth','enterprise')),
  amount_usdc     numeric     not null,

  -- Payment confirmation
  tx_signature    text,        -- Solana tx signature once paid

  -- Pipeline state
  status          text        not null default 'pending_payment'
    check (status in ('pending_payment','paid','in_pipeline','completed','cancelled')),
  notes           text,
  asset_id        text         -- links to V5 userAssetStore once pipeline starts
);

create index if not exists tr_status_idx     on public.tokenization_requests (status);
create index if not exists tr_created_at_idx on public.tokenization_requests (created_at desc);
create index if not exists tr_tier_idx       on public.tokenization_requests (tier);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists tr_set_updated_at on public.tokenization_requests;
create trigger tr_set_updated_at
  before update on public.tokenization_requests
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.tokenization_requests enable row level security;

-- Anyone (anon) can insert a NEW request — the form needs this
drop policy if exists "anon can insert requests" on public.tokenization_requests;
create policy "anon can insert requests"
  on public.tokenization_requests for insert
  to anon, authenticated
  with check (status = 'pending_payment');

-- Anyone can update tx_signature on a pending_payment row by ID
-- (used to confirm payment with the row ID returned at insert time)
drop policy if exists "anon can update pending" on public.tokenization_requests;
create policy "anon can update pending"
  on public.tokenization_requests for update
  to anon, authenticated
  using (status = 'pending_payment')
  with check (status in ('pending_payment','paid'));

-- No public read policy → only service-role / dashboard can SELECT.
-- This keeps submitter info private. Admins query via service role for fulfillment.

-- Verify the migration ran
select 'tokenization_requests table ready' as status,
       count(*) as existing_rows
from public.tokenization_requests;
