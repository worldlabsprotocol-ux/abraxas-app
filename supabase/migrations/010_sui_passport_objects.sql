-- ================================================================
-- 010_sui_passport_objects.sql — On-chain Passport object registry
-- Maps Sui holder address → Passport object ID after Veriff approve
-- ================================================================

create table if not exists public.sui_passport_objects (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  sui_address       text        not null unique,
  object_id         text        not null,
  network           text        not null default 'devnet',
  stamp_bitmask     integer     not null default 0,

  create_tx_digest  text,
  stamps_tx_digest  text,
  provisioned_at    timestamptz not null default now(),

  constraint sui_passport_objects_object_id_key unique (object_id)
);

create index if not exists spo_sui_address_idx on public.sui_passport_objects (sui_address);
create index if not exists spo_object_id_idx on public.sui_passport_objects (object_id);

alter table public.sui_passport_objects enable row level security;
