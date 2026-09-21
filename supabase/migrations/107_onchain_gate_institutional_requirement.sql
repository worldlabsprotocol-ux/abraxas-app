-- FILE: supabase/migrations/107_onchain_gate_institutional_requirement.sql
-- DEMO-first immutable institutional class on verified onchain gate deployments.
-- Apply DEMO first: https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide/sql/new
-- Do not auto-apply from Vercel, this PR, or any agent. Safe boolean only.

alter table public.onchain_gate_deployments
  add column if not exists require_institutional boolean not null default false;

comment on column public.onchain_gate_deployments.require_institutional is
  'Server-derived from verified chain observation and server-owned policy. Immutable after insert. Never client-authored.';
