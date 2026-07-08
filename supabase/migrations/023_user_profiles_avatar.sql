-- FILE: supabase/migrations/023_user_profiles_avatar.sql
-- Extend user_profiles for zkLogin avatars (run manually in Supabase SQL editor).

alter table public.user_profiles
  add column if not exists avatar_color text;

create index if not exists user_profiles_username_idx
  on public.user_profiles (lower(username))
  where username is not null;
