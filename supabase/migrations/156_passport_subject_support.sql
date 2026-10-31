-- Build 921B: holder-subject support queue. Historical contact submissions remain unchanged.
-- Apply manually after 136/137 and verify service_role grants before enabling the new route.
begin;

create table if not exists public.passport_subject_support_requests (
  id text primary key,
  holder_subject_id text not null references public.passport_holder_subjects(subject_id),
  reference text not null unique,
  issue_type text not null check (issue_type in ('account_access','verification','partner_request','privacy','other')),
  status text not null default 'received' check (status in ('received','in_review','resolved')),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists passport_subject_support_holder_idx
  on public.passport_subject_support_requests(holder_subject_id, created_at desc);

alter table public.passport_subject_support_requests enable row level security;
revoke all on table public.passport_subject_support_requests from public, anon, authenticated;
grant select, insert, update on table public.passport_subject_support_requests to service_role;

commit;
