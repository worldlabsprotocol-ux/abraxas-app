-- FILE: supabase/migrations/119_launchpad_production_schema_repair.sql
-- Launchpad production schema dependency repair (forward-only).
--
-- Purpose: idempotently restore canonical DDL prerequisites when a database has
-- partner_launchpad_applications (084) but skipped intermediate Launchpad migrations
-- before 116_partner_application_policy_bindings.sql.
--
-- This migration does NOT replace applying canonical migrations 085, 095, 099, and 110
-- when their RPCs/functions are missing. It only ensures required columns and indexes
-- exist so later migrations (116–118) can apply safely.
--
-- Does NOT create hosted_partner_flow_handoffs — apply 099_hosted_partner_flow_handoffs.sql.
--
-- Prerequisite: 084_partner_launchpad_foundation.sql
-- Apply before: 116_partner_application_policy_bindings.sql (when production_activated_at absent)
-- Safe to re-run: all DDL uses IF NOT EXISTS.

-- 085_partner_launchpad_hardening.sql — production credential columns
ALTER TABLE public.partner_launchpad_applications
  ADD COLUMN IF NOT EXISTS production_api_key_id uuid
    REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_key_revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_key_encrypted text;

CREATE INDEX IF NOT EXISTS partner_launchpad_applications_prod_key_idx
  ON public.partner_launchpad_applications (production_api_key_id)
  WHERE production_api_key_id IS NOT NULL;

-- 095_partner_launchpad_production_credential_atomic.sql — app-scoped live keys
ALTER TABLE public.partner_api_keys
  ADD COLUMN IF NOT EXISTS launchpad_application_id uuid
    REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_api_keys_one_active_live_per_app
  ON public.partner_api_keys (launchpad_application_id)
  WHERE revoked_at IS NULL
    AND launchpad_application_id IS NOT NULL
    AND key_prefix LIKE 'abx_live_%';

-- 110_partner_launchpad_activate_production_atomic.sql — canonical activation timestamp
ALTER TABLE public.partner_launchpad_applications
  ADD COLUMN IF NOT EXISTS production_activated_at timestamptz;

-- Conservative backfill: only from authoritative activation evidence.
-- Never use now(). environment = 'production' alone is insufficient.

-- Path A: canonical activation activity from migration 110+
UPDATE public.partner_launchpad_applications a
   SET production_activated_at = evt.activated_at
  FROM (
    SELECT application_id, MIN(created_at) AS activated_at
      FROM public.partner_launchpad_activity
     WHERE event_type = 'production_application_activated'
     GROUP BY application_id
  ) evt
 WHERE a.id = evt.application_id
   AND a.production_activated_at IS NULL;

-- Path B: legacy 085 approve path — approved request + active abx_live_ credential
UPDATE public.partner_launchpad_applications a
   SET production_activated_at = r.reviewed_at
  FROM public.partner_production_access_requests r
  JOIN public.partner_api_keys k
    ON k.id = a.production_api_key_id
   AND k.partner_id = a.partner_id
 WHERE r.application_id = a.id
   AND r.partner_id = a.partner_id
   AND r.status = 'approved'
   AND r.reviewed_at IS NOT NULL
   AND a.production_api_key_id IS NOT NULL
   AND k.revoked_at IS NULL
   AND k.key_prefix LIKE 'abx_live_%'
   AND a.production_activated_at IS NULL;

-- Link existing live keys to applications when derivable from production_api_key_id
UPDATE public.partner_api_keys k
   SET launchpad_application_id = a.id
  FROM public.partner_launchpad_applications a
 WHERE k.id = a.production_api_key_id
   AND k.partner_id = a.partner_id
   AND k.launchpad_application_id IS NULL
   AND k.key_prefix LIKE 'abx_live_%';
