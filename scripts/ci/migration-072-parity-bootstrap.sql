-- FILE: scripts/ci/migration-072-parity-bootstrap.sql
-- Minimal faithful fixture for migration 072 CI parity (roles, tables, grants).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parity_unprivileged') THEN
    CREATE ROLE parity_unprivileged LOGIN NOINHERIT PASSWORD 'parity_unprivileged';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,
  actor_id text,
  action text NOT NULL,
  object_type text,
  object_id text,
  policy_id text,
  policy_version int,
  metadata jsonb NOT NULL DEFAULT '{}',
  event_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_object
  ON public.audit_events (object_type, object_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.design_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text,
  email text NOT NULL,
  website text,
  use_case text,
  monthly_volume text,
  integration_type text DEFAULT 'passport_gate',
  public_name_ok boolean DEFAULT false,
  status text DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  promoted_partner_id text,
  reviewer_notes text,
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS design_partners_status_idx ON public.design_partners (status);
CREATE INDEX IF NOT EXISTS design_partners_promoted_idx
  ON public.design_partners (promoted_partner_id)
  WHERE promoted_partner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL UNIQUE,
  company text NOT NULL,
  contact_name text,
  contact_email text,
  status text NOT NULL DEFAULT 'active',
  allowed_environments text[] NOT NULL DEFAULT ARRAY['sandbox', 'production'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case text,
  is_external boolean NOT NULL DEFAULT true,
  onboarding_notes text,
  public_listing_ok boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS partners_status_idx ON public.partners (status);

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  display_name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['verify:credential', 'verify:registry'],
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS partner_api_keys_hash_idx
  ON public.partner_api_keys (key_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS partner_api_keys_partner_idx
  ON public.partner_api_keys (partner_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Reproduce pre-073 Production privilege drift (Supabase default-style broad grants).
-- Migration 073 must reset these to the Phase 1 hardened posture.
GRANT ALL ON TABLE public.audit_events TO PUBLIC;
GRANT ALL ON TABLE public.audit_events TO anon;
GRANT ALL ON TABLE public.audit_events TO authenticated;
GRANT ALL ON TABLE public.audit_events TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.design_partners TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partners TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_api_keys TO service_role;

GRANT USAGE ON SCHEMA public TO parity_unprivileged;
