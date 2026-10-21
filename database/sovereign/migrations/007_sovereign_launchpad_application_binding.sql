-- Bind sovereign sandbox API keys to Launchpad applications (parity with Supabase 095 / 148).
begin;

alter table public.partner_api_keys
  add column if not exists launchpad_application_id uuid
    references public.partner_launchpad_applications (id) on delete set null;

create index if not exists partner_api_keys_launchpad_application_idx
  on public.partner_api_keys (launchpad_application_id)
  where launchpad_application_id is not null;

commit;
