-- 037_active_wallet_unique.sql
-- One active wallet binding per (chain, wallet_address).
-- Prerequisite: 036_connect_wallet_authority.sql

-- PREFLIGHT:
-- select indexname from pg_indexes where tablename = 'wallet_bindings' and indexname = 'idx_wallet_bindings_active_wallet_unique';

create unique index if not exists idx_wallet_bindings_active_wallet_unique
  on public.wallet_bindings (chain, wallet_address)
  where binding_status = 'active' and revoked_at is null;

-- POST-MIGRATION:
-- select indexname, indexdef from pg_indexes where indexname = 'idx_wallet_bindings_active_wallet_unique';
