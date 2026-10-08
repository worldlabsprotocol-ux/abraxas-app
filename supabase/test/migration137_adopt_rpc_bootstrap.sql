-- Minimal schema bootstrap for migration 137 adopt RPC SQL parity tests.
-- Not for production apply.

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL UNIQUE,
  company text NOT NULL,
  contact_name text,
  contact_email text,
  status text NOT NULL DEFAULT 'active',
  allowed_environments text[] NOT NULL DEFAULT ARRAY['sandbox', 'production'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_policies (
  id text NOT NULL,
  partner_id text NOT NULL,
  version int NOT NULL DEFAULT 1,
  name text NOT NULL,
  rules_json jsonb NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deprecated', 'draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deprecate_effective_at timestamptz,
  PRIMARY KEY (id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_policies_one_active_per_id
  ON public.partner_policies (id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.partner_launchpad_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug text NOT NULL UNIQUE,
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE RESTRICT,
  application_name text NOT NULL,
  display_name text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  policy_id text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  policy_template_id text NOT NULL,
  allowed_return_urls text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

INSERT INTO public.partners (partner_id, company, status)
VALUES ('partner-m137-adopt-rpc', 'M137 Adopt RPC Test', 'active')
ON CONFLICT (partner_id) DO NOTHING;

INSERT INTO public.partner_policies (id, partner_id, version, name, rules_json, status, effective_at)
VALUES
  ('policy-m137-adopt-rpc', 'partner-m137-adopt-rpc', 1, 'v1', '{}'::jsonb, 'deprecated', timestamptz '2020-01-01'),
  ('policy-m137-adopt-rpc', 'partner-m137-adopt-rpc', 2, 'v2', '{}'::jsonb, 'active', timestamptz '2024-01-01'),
  ('policy-m137-adopt-rpc', 'partner-m137-adopt-rpc', 3, 'v3 draft', '{}'::jsonb, 'draft', timestamptz '2099-01-01')
ON CONFLICT (id, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.partner_launchpad_application_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  policy_template_id text NOT NULL,
  binding_role text NOT NULL DEFAULT 'secondary'
    CHECK (binding_role IN ('primary', 'secondary')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired', 'pending_review')),
  sandbox_configured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, policy_id)
);
