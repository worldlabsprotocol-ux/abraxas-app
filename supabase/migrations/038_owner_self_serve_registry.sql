-- 038_owner_self_serve_registry.sql
-- Instant owner listings — public slug on launch, no manual promote required.

alter table public.external_asset_applications
  add column if not exists registry_published_at timestamptz;

create index if not exists external_asset_applications_slug_idx
  on public.external_asset_applications (public_verify_slug)
  where public_verify_slug is not null;

create index if not exists external_asset_applications_published_idx
  on public.external_asset_applications (registry_published_at desc nulls last)
  where public_verify_slug is not null and is_demo_sample = false;

comment on column public.external_asset_applications.registry_published_at is
  'When the owner self-serve listing went live on /verify and the registry explorer.';
