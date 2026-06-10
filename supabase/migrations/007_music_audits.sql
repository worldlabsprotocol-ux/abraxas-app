-- 007_music_audits.sql — Music Royalty Audit backend
-- Supabase SQL Editor → paste → Run

-- Artist audit requests
create table if not exists public.music_audit_requests (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null    default now(),
  updated_at      timestamptz not null    default now(),

  -- Who submitted
  artist_name     text        not null,
  contact_email   text        not null,
  contact_x       text,
  contact_phone   text,

  -- Their situation
  distributor     text,       -- DistroKid, TuneCore, CD Baby, etc.
  pro_affiliation text,       -- ASCAP, BMI, SESAC, none
  catalog_size    text,       -- "1-10 tracks", "10-50", "50+"
  notes           text,

  -- Pipeline
  status          text        not null default 'submitted'
    check (status in ('submitted','reviewing','audit_complete','follow_up','closed')),
  assigned_to     text,       -- Abraxas team member name
  priority        text        not null default 'standard'
    check (priority in ('standard','rush')),

  -- Results (populated after audit is run)
  total_tracks    int,
  critical_gaps   int,
  high_gaps       int,
  est_recovery    text,       -- e.g. "Potentially significant unclaimed mechanicals"
  audit_notes     text
);

-- Individual tracks within an audit request
create table if not exists public.music_audit_tracks (
  id                  uuid        primary key default gen_random_uuid(),
  request_id          uuid        not null
    references public.music_audit_requests(id) on delete cascade,
  created_at          timestamptz not null default now(),

  title               text        not null,
  isrc                text,
  iswc                text,
  pro_registration    text,       -- which PRO (ASCAP/BMI/SESAC/none)
  mlc_registered      boolean     not null default false,
  split_sheet_signed  boolean     not null default false,
  release_year        text,
  co_writers          text,
  distributor         text,

  -- Gap analysis results (stored as JSON array of Gap objects)
  gaps                jsonb       not null default '[]'
);

-- ── Indexes ──────────────────────────────────────────────────────
create index if not exists mar_email_idx on public.music_audit_requests (contact_email);
create index if not exists mat_req_idx   on public.music_audit_tracks (request_id);

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.music_audit_requests enable row level security;
alter table public.music_audit_tracks    enable row level security;

grant usage  on schema public              to anon, authenticated;
grant insert on public.music_audit_requests to anon, authenticated;
grant insert on public.music_audit_tracks   to anon, authenticated;

create policy "anon_insert_audit_requests"
  on public.music_audit_requests for insert
  to anon, authenticated with check (true);

create policy "anon_insert_audit_tracks"
  on public.music_audit_tracks for insert
  to anon, authenticated with check (true);

-- Verify
select id, artist_name, status, created_at
from   public.music_audit_requests
order  by created_at desc limit 5;
