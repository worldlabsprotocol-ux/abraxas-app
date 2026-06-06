-- Migration 003 — add Wyoming LLC columns to tokenization_requests
-- Paste into Supabase SQL Editor → Run (safe to run multiple times)

alter table public.tokenization_requests
  add column if not exists estimated_valuation text,
  add column if not exists description         text,
  add column if not exists jurisdiction        text default 'Wyoming, USA',
  add column if not exists asset_type          text default 'WYOMING_LLC',
  add column if not exists lifecycle_state     text default 'SUBMITTED';

-- Index for admin queries
create index if not exists tr_asset_type_idx
  on public.tokenization_requests (asset_type);

create index if not exists tr_lifecycle_state_idx
  on public.tokenization_requests (lifecycle_state);

-- Verify
select column_name, data_type
from   information_schema.columns
where  table_name = 'tokenization_requests'
order  by ordinal_position;
