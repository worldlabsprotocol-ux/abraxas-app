-- Sovereign equivalent of migration 145 (WebAuthn atomic consume + membership status).
begin;

alter table public.abraxas_account_partner_memberships
  add column if not exists status text not null default 'active'
  check (status in ('active', 'revoked'));

create unique index if not exists abraxas_sandbox_enrollments_account_partner_uq
  on public.abraxas_sandbox_enrollments (account_id, partner_id);

create or replace function public.abraxas_consume_webauthn_challenge_atomic(
  p_challenge_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.abraxas_webauthn_challenges%rowtype;
begin
  update public.abraxas_webauthn_challenges
     set consumed_at = pg_catalog.now()
   where id = p_challenge_id
     and consumed_at is null
     and expires_at > pg_catalog.now()
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'challenge_unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'purpose', v_row.purpose,
    'account_id', v_row.account_id,
    'challenge', v_row.challenge,
    'origin', v_row.origin,
    'rp_id', v_row.rp_id
  );
end;
$$;

revoke all on function public.abraxas_consume_webauthn_challenge_atomic(text) from public;
grant execute on function public.abraxas_consume_webauthn_challenge_atomic(text) to abraxas_runtime;

commit;
