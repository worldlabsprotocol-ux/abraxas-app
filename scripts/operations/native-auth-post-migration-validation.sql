-- Post-migration validation — Production bztwutzprwsdrtqdpymf (authorized apply only).

select
  to_regclass('public.abraxas_accounts') is not null as has_accounts,
  to_regclass('public.abraxas_webauthn_challenges') is not null as has_challenges;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'abraxas_account%'
order by 1;

select public.abraxas_consume_webauthn_challenge_atomic('__validation_probe__') as rpc_probe;
