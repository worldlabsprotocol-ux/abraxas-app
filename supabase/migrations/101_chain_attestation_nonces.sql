-- FILE: supabase/migrations/101_chain_attestation_nonces.sql
-- DEMO-first durable chain-attestation nonce store. Separate from venue/payment nonces.
-- Apply DEMO first. Do not auto-apply from Vercel. No in-memory fallback.

create table if not exists public.chain_attestation_nonces (
  partner_id text not null,
  network_id text not null,
  nonce_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  constraint chain_attestation_nonces_hash_hex
    check (nonce_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists chain_attestation_nonces_partner_network_nonce_uq
  on public.chain_attestation_nonces (partner_id, network_id, nonce_hash);

comment on table public.chain_attestation_nonces is
  'One-time chain eligibility attestation nonces. Hashes only. Not venue or payment nonces.';

alter table public.chain_attestation_nonces enable row level security;

revoke all on table public.chain_attestation_nonces from public, anon, authenticated;
grant select, insert on table public.chain_attestation_nonces to service_role;

create or replace function public.chain_attestation_consume_nonce(
  p_partner_id text,
  p_network_id text,
  p_nonce_hash text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  begin
    insert into public.chain_attestation_nonces (partner_id, network_id, nonce_hash, expires_at)
    values (p_partner_id, p_network_id, p_nonce_hash, p_expires_at);
    return jsonb_build_object('ok', true, 'code', 'consumed');
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'replayed');
  end;
end;
$$;

revoke all on function public.chain_attestation_consume_nonce(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.chain_attestation_consume_nonce(text, text, text, timestamptz) to service_role;
