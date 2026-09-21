-- FILE: supabase/migrations/098_verification_issuer_trust_registry.sql
-- Verification issuer trust catalog snapshot.
--
-- DEMO-first. Do not apply from Vercel or this PR.
-- Source-controlled TypeScript records remain the publication authority.
-- Browser cannot insert or activate issuers. Service-role only.

CREATE TABLE IF NOT EXISTS public.verification_issuer_trust_registry (
  catalog_version text PRIMARY KEY,
  notice text NOT NULL,
  record_count integer NOT NULL CHECK (record_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_issuer_trust_registry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.verification_issuer_trust_registry FROM PUBLIC;
REVOKE ALL ON public.verification_issuer_trust_registry FROM anon, authenticated;
GRANT SELECT ON public.verification_issuer_trust_registry TO postgres, service_role;
