-- FILE: supabase/migrations/151_portable_export_status_checkpoints_grants.sql
-- PostgREST service role must bump checkpoints for BUILD #824 Demo portable export.

GRANT SELECT, INSERT, UPDATE ON TABLE public.portable_export_status_checkpoints TO postgres, service_role;