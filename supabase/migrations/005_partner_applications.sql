-- Migration 005 — partner_applications table
-- Supabase SQL Editor → paste → Run

create table if not exists public.partner_applications (
  id             uuid         primary key default gen_random_uuid(),
  created_at     timestamptz  not null default now(),
  firm_name      text         not null,
  contact_name   text         not null,
  contact_email  text         not null,
  contact_x      text,
  partner_type   text         not null check (partner_type in ('appraiser','attorney','title','auditor','other')),
  jurisdiction   text         not null,
  license_number text,
  website        text,
  notes          text,
  status         text         not null default 'pending_review'
);

alter table public.partner_applications enable row level security;

grant usage  on schema public                to anon, authenticated;
grant insert on public.partner_applications  to anon, authenticated;

create policy "anon_insert_partners"
  on public.partner_applications for insert
  to anon, authenticated
  with check (true);

-- Verify
select id, firm_name, partner_type, status, created_at
from   public.partner_applications
order  by created_at desc
limit  10;
