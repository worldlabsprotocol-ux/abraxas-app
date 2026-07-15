-- FILE: supabase/migrations/033_owner_portal_settlement.sql
-- Owner portal: wallet link + USDC settlement state on external asset applications.

alter table public.external_asset_applications
  add column if not exists linked_wallet text,
  add column if not exists wallet_linked_at timestamptz,
  add column if not exists deal_status text not null default 'intake',
  add column if not exists settlement_amount_usdc numeric,
  add column if not exists settlement_tx_digest text,
  add column if not exists settlement_verified_at timestamptz,
  add column if not exists deal_ready_at timestamptz;

create index if not exists external_asset_applications_deal_status_idx
  on public.external_asset_applications (deal_status);

comment on column public.external_asset_applications.deal_status is
  'intake | review | verified | deal_ready | settled';

-- Demo land sample: wallet + deal-ready pilot for owner journey walkthrough
update public.external_asset_applications
set
  deal_status = 'deal_ready',
  settlement_amount_usdc = 100,
  deal_ready_at = now(),
  status = 'verified',
  named_reviewer = 'Abraxas pilot reviewer',
  review_signed_at = now(),
  updated_at = now()
where public_verify_slug = 'ABX-DEMO-LAND-001'
  and is_demo_sample = true;
