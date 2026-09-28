-- FILE: supabase/migrations/109_partner_solana_usdc_billing.sql
-- Service-role-only Solana USDC plan payments. Apply manually; never from Vercel.
-- Abraxas verifies settlement but never stores wallet keys, signs, or broadcasts.

alter table public.partner_entitlements
  add column if not exists paid_through timestamptz,
  add column if not exists billing_source text,
  add column if not exists billing_intent_id uuid;

create table if not exists public.partner_billing_intents (
  intent_id uuid primary key default gen_random_uuid(),
  partner_id text not null references public.partners(partner_id) on delete cascade,
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  plan_id text not null check (plan_id in ('launch', 'scale')),
  network_id text not null check (network_id in ('solana_devnet', 'solana_mainnet')),
  recipient text not null,
  token_mint text not null,
  amount_minor bigint not null check (amount_minor > 0),
  reference_pubkey text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired')),
  transaction_signature text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check ((status = 'confirmed') = (transaction_signature is not null and confirmed_at is not null))
);

create index if not exists partner_billing_intents_partner_created_idx
  on public.partner_billing_intents(partner_id, created_at desc);
create index if not exists partner_billing_intents_application_created_idx
  on public.partner_billing_intents(application_id, created_at desc);

alter table public.partner_billing_intents enable row level security;
revoke all on public.partner_billing_intents from public, anon, authenticated;
grant select, insert, update on public.partner_billing_intents to service_role;

create or replace function public.confirm_partner_solana_billing_intent(
  p_intent_id uuid,
  p_partner_id text,
  p_transaction_signature text,
  p_confirmed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent public.partner_billing_intents%rowtype;
  v_receipt_limit bigint;
  v_api_limit bigint;
  v_paid_from timestamptz;
begin
  if coalesce(p_transaction_signature, '') = '' then
    return false;
  end if;

  select * into v_intent
  from public.partner_billing_intents
  where intent_id = p_intent_id and partner_id = p_partner_id
  for update;

  if not found then return false; end if;
  if v_intent.status = 'confirmed' then
    return v_intent.transaction_signature = p_transaction_signature;
  end if;
  if v_intent.status <> 'pending' or v_intent.expires_at <= p_confirmed_at then
    update public.partner_billing_intents
      set status = 'expired'
      where intent_id = p_intent_id and status = 'pending';
    return false;
  end if;

  if v_intent.plan_id = 'launch' then
    v_receipt_limit := 2500;
    v_api_limit := 100000;
  elsif v_intent.plan_id = 'scale' then
    v_receipt_limit := 25000;
    v_api_limit := 1000000;
  else
    return false;
  end if;

  select greatest(coalesce(paid_through, p_confirmed_at), p_confirmed_at)
    into v_paid_from
    from public.partner_entitlements
    where partner_id = p_partner_id;

  v_paid_from := coalesce(v_paid_from, p_confirmed_at);

  insert into public.partner_entitlements (
    partner_id, plan_id, monthly_receipt_limit, monthly_api_call_limit,
    enforcement_mode, paid_through, billing_source, billing_intent_id,
    updated_at, updated_by
  ) values (
    p_partner_id, v_intent.plan_id, v_receipt_limit, v_api_limit,
    'observe', v_paid_from + interval '30 days', 'solana_usdc',
    v_intent.intent_id, p_confirmed_at, 'solana_usdc_payment'
  )
  on conflict (partner_id) do update set
    plan_id = excluded.plan_id,
    monthly_receipt_limit = excluded.monthly_receipt_limit,
    monthly_api_call_limit = excluded.monthly_api_call_limit,
    enforcement_mode = 'observe',
    paid_through = excluded.paid_through,
    billing_source = excluded.billing_source,
    billing_intent_id = excluded.billing_intent_id,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  update public.partner_billing_intents set
    status = 'confirmed',
    transaction_signature = p_transaction_signature,
    confirmed_at = p_confirmed_at
  where intent_id = p_intent_id;

  return true;
end;
$$;

revoke all on function public.confirm_partner_solana_billing_intent(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.confirm_partner_solana_billing_intent(uuid, text, text, timestamptz)
  to service_role;
