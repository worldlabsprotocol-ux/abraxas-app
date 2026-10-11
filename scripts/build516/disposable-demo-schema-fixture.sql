-- Sanitized Demo-representative schema (no PII). Matches key constraints for Solana incremental 134–138.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.partner_policies (
  id            text        NOT NULL,
  partner_id    text        NOT NULL,
  version       int         NOT NULL DEFAULT 1,
  name          text        NOT NULL,
  rules_json    jsonb       NOT NULL,
  effective_at  timestamptz NOT NULL DEFAULT now(),
  status        text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','deprecated','draft')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_policies_one_active_per_id
  ON public.partner_policies (id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  wallet_address      text        NOT NULL UNIQUE,
  status              text        NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.consent_receipts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  text NOT NULL,
  partner_id  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_decisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.decision_receipts (
  id                       text PRIMARY KEY,
  verification_decision_id uuid NOT NULL REFERENCES public.verification_decisions(id) ON DELETE RESTRICT,
  consent_receipt_id       uuid REFERENCES public.consent_receipts(id) ON DELETE SET NULL,
  partner_id               text NOT NULL,
  policy_id                text NOT NULL,
  policy_version           int NOT NULL,
  subject_pseudonym_id     text NOT NULL,
  decision_result          text NOT NULL CHECK (decision_result IN ('approved','denied','manual_review')),
  evaluated_at             timestamptz NOT NULL DEFAULT now(),
  payload_hash             text NOT NULL,
  signature                text NOT NULL,
  status                   text NOT NULL DEFAULT 'active'
);

GRANT USAGE ON SCHEMA public TO postgres, abraxas516;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO postgres, abraxas516;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO abraxas516;
