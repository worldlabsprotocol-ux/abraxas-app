-- FILE: supabase/migrations/150_portable_export_status_checkpoints.sql
-- Monotonic signed status versions for Demo operational portable export (no new infrastructure).

create table if not exists public.portable_export_status_checkpoints (
  receipt_id text primary key,
  status_version bigint not null default 0 check (status_version >= 0)
);

comment on table public.portable_export_status_checkpoints is
  'Issuer-side monotonic status_version for portable verification export on operational Demo. Relying parties verify signed statements — this table is not a trust root.';
