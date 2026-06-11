create table if not exists public.stay_requests (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  booking_id  text        not null,
  property    text,
  check_in    text        not null,
  check_out   text        not null,
  guests      int,
  guest_name  text        not null,
  email       text        not null,
  wallet      text,
  notes       text,
  nights      int,
  est_usdc    int,
  status      text        not null default 'pending'
);
alter table public.stay_requests enable row level security;
grant usage on schema public to anon, authenticated;
grant insert on public.stay_requests to anon, authenticated;
create policy "anon_insert_stays" on public.stay_requests for insert to anon, authenticated with check (true);
