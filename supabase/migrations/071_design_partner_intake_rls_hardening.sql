-- FILE: supabase/migrations/071_design_partner_intake_rls_hardening.sql
-- Close direct anon/authenticated INSERT bypass on design partner applications.
-- Prerequisite: 016_design_partners.sql
-- Apply only after API route uses service_role for inserts.
--
-- Note: no dedup lookup index is added here. The best-effort duplicate query uses
-- PostgREST ILIKE filters on email/company, which do not reliably use a btree
-- expression index on lower(email), lower(company).

ALTER TABLE public.design_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_design_partners" ON public.design_partners;

REVOKE INSERT ON public.design_partners FROM anon, authenticated;

-- Post-apply verification (operator SQL Editor; read-only):
-- SELECT c.relrowsecurity
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relname = 'design_partners';
--
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'design_partners';
--
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'design_partners'
-- ORDER BY grantee, privilege_type;
--
-- Expected: relrowsecurity = true;
-- no INSERT policy for anon/authenticated;
-- no INSERT privilege for anon/authenticated;
-- service_role continues to operate via RLS bypass for admin/API routes.
