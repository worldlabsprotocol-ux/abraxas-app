-- FILE: supabase/migrations/013_cielo_protocol_calendar.sql
-- Abraxas Protocol Calendar: source of truth for Cielo crypto bookings.
-- No Airbnb host iCal required.

create table if not exists public.cielo_calendar_blocks (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  start_date  date        not null,
  end_date    date        not null,
  source      text        not null default 'operator',
  booking_id  text,
  note        text,
  created_by  text        default 'system'
);

create index if not exists cielo_calendar_blocks_dates
  on public.cielo_calendar_blocks (start_date, end_date);

alter table public.cielo_calendar_blocks enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.cielo_calendar_blocks to anon, authenticated;
grant insert, update, delete on public.cielo_calendar_blocks to authenticated;

create policy "public_read_cielo_calendar"
  on public.cielo_calendar_blocks for select to anon, authenticated using (true);
