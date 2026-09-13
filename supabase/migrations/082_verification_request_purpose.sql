-- Persist partner-flow purpose on verification requests (browse vs purchase).

alter table if exists public.verification_requests
  add column if not exists purpose text;

comment on column public.verification_requests.purpose is
  'Partner flow purpose at request creation (e.g. browse, purchase).';
