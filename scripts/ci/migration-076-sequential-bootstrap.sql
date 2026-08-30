-- FILE: scripts/ci/migration-076-sequential-bootstrap.sql
-- Fresh sequential path schema before 049 → 051 (pre-055 PK=id).

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL UNIQUE,
  company text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'pilot',
  is_external boolean NOT NULL DEFAULT true,
  public_listing_ok boolean NOT NULL DEFAULT false,
  assigned_policy_id text,
  allowed_environments text[] NOT NULL DEFAULT ARRAY['sandbox'],
  allowed_return_urls text[],
  use_case text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_policies (
  id            text        PRIMARY KEY,
  partner_id    text        NOT NULL,
  version       int         NOT NULL DEFAULT 1,
  name          text        NOT NULL,
  rules_json    jsonb       NOT NULL,
  effective_at  timestamptz NOT NULL DEFAULT now(),
  status        text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'deprecated', 'draft')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credential_schemas (
  id text PRIMARY KEY,
  name text NOT NULL,
  version int NOT NULL DEFAULT 1,
  claim_types text[] NOT NULL DEFAULT '{}',
  w3c_type text,
  status text NOT NULL DEFAULT 'draft'
);

DELETE FROM public.partner_policies WHERE id = 'good-trouble-retail-v1';
DELETE FROM public.partners WHERE partner_id = 'good-trouble-cannabis';
