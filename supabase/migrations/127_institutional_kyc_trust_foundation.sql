-- 127_institutional_kyc_trust_foundation.sql
-- Individual identity subjects, provider bindings, and inbound event replay protection.
-- Forward-only. Service-role writes. No destructive changes.
-- OPERATOR: apply manually in Supabase SQL editor when ready.

CREATE TABLE IF NOT EXISTS public.identity_subjects (
  id                  text        PRIMARY KEY,
  subject_type        text        NOT NULL DEFAULT 'individual'
                      CHECK (subject_type IN ('individual', 'organization')),
  claims_subject_key  text        NOT NULL UNIQUE,
  status              text        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'revoked', 'merged')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_subjects_claims_key_idx
  ON public.identity_subjects (claims_subject_key);

ALTER TABLE public.identity_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.provider_subject_bindings (
  provider_id               text        NOT NULL REFERENCES public.credential_issuers(id) ON DELETE RESTRICT,
  provider_subject_ref_hash text        NOT NULL,
  abraxas_subject_id        text        NOT NULL REFERENCES public.identity_subjects(id) ON DELETE RESTRICT,
  bound_at                  timestamptz NOT NULL DEFAULT now(),
  status                    text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'revoked')),
  CONSTRAINT provider_subject_bindings_pk PRIMARY KEY (provider_id, provider_subject_ref_hash)
);

CREATE INDEX IF NOT EXISTS provider_subject_bindings_subject_idx
  ON public.provider_subject_bindings (abraxas_subject_id);

ALTER TABLE public.provider_subject_bindings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.provider_event_replay (
  provider_id         text        NOT NULL,
  provider_event_id   text        NOT NULL,
  event_hash          text        NOT NULL,
  abraxas_subject_id  text        REFERENCES public.identity_subjects(id) ON DELETE SET NULL,
  outcome             text        NOT NULL,
  processed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_event_replay_pk PRIMARY KEY (provider_id, provider_event_id)
);

CREATE INDEX IF NOT EXISTS provider_event_replay_processed_idx
  ON public.provider_event_replay (processed_at DESC);

ALTER TABLE public.provider_event_replay ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.identity_subjects FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.provider_subject_bindings FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.provider_event_replay FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.identity_subjects TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.provider_subject_bindings TO service_role;
GRANT SELECT, INSERT ON TABLE public.provider_event_replay TO service_role;

CREATE OR REPLACE FUNCTION public.consume_provider_event_replay(
  p_provider_id text,
  p_provider_event_id text,
  p_event_hash text,
  p_abraxas_subject_id text DEFAULT NULL,
  p_outcome text DEFAULT 'processed'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.provider_event_replay (
      provider_id,
      provider_event_id,
      event_hash,
      abraxas_subject_id,
      outcome
    ) VALUES (
      p_provider_id,
      p_provider_event_id,
      p_event_hash,
      p_abraxas_subject_id,
      p_outcome
    );
    RETURN jsonb_build_object('ok', true, 'code', 'consumed');
  EXCEPTION
    WHEN unique_violation THEN
      RETURN (
        SELECT jsonb_build_object(
          'ok', false,
          'code', CASE
            WHEN event_hash = p_event_hash THEN 'duplicate'
            ELSE 'conflict'
          END,
          'existing_hash', event_hash,
          'existing_outcome', outcome
        )
        FROM public.provider_event_replay
        WHERE provider_id = p_provider_id
          AND provider_event_id = p_provider_event_id
        LIMIT 1
      );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_provider_event_replay(text, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_provider_event_replay(text, text, text, text, text) TO service_role;

-- Mock reference provider for sandbox/tests (not a vendor integration).
INSERT INTO public.credential_issuers (
  id,
  legal_name,
  display_name,
  issuer_type,
  issuer_status,
  trust_status,
  supported_claims,
  jurisdictions,
  assurance_levels,
  audit_status,
  metadata
) VALUES (
  'issuer:mock-approved-kyc',
  'Mock Approved KYC (Reference)',
  'Mock Approved KYC',
  'external_kyc_provider',
  'active',
  'active',
  ARRAY['identity_verified', 'residency_country']::text[],
  ARRAY['global']::text[],
  ARRAY['L1', 'L2']::text[],
  'sandbox_reference',
  jsonb_build_object(
    'reference_only', true,
    'max_assurance', 'L2',
    'authorized_claims', jsonb_build_array('identity_verified', 'residency_country'),
    'environment', 'sandbox',
    'ingest_auth', jsonb_build_object(
      'type', 'hmac_sha256',
      'key_id', 'mock-ref-v1',
      'secret_env', 'PROVIDER_INGEST_TEST_SECRET'
    )
  )
) ON CONFLICT (id) DO UPDATE SET
  issuer_status = EXCLUDED.issuer_status,
  supported_claims = EXCLUDED.supported_claims,
  metadata = EXCLUDED.metadata;
