-- FILE: scripts/ci/migration-076-parity-bootstrap.sql
-- Fixture-only bootstrap for Good Trouble policy immutability + migration 076 parity CI.
-- Seeds post-051 active good-trouble-retail-v1, then applies 055 immutability trigger.

CREATE TABLE IF NOT EXISTS public.partner_policies (
  id            text        NOT NULL,
  partner_id    text        NOT NULL,
  version       int         NOT NULL DEFAULT 1,
  name          text        NOT NULL,
  rules_json    jsonb       NOT NULL,
  effective_at  timestamptz NOT NULL DEFAULT now(),
  status        text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'deprecated', 'draft')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

DELETE FROM public.partner_policies WHERE id = 'good-trouble-retail-v1';

INSERT INTO public.partner_policies (id, partner_id, version, name, rules_json, status)
VALUES (
  'good-trouble-retail-v1',
  'good-trouble-cannabis',
  1,
  'Good Trouble — regulated retail eligibility v1 (pilot)',
  '{
    "sandbox_only": true,
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "liveness_passed", "max_age_hours": 8760},
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2"},
      {"claim_type": "residency_country", "max_age_hours": 8760}
    ],
    "account_required": true,
    "consent_required": true,
    "biometric_thresholds": {
      "face_min": 0.90,
      "liveness_min": 0.92,
      "fraud_risk_max": 0.15,
      "alignment_min": 0.45,
      "blur_min": 0.40,
      "lighting_min": 0.38,
      "screen_replay_max": 0.45,
      "deepfake_max": 0.50
    },
    "retail_minimum_age": 21,
    "session_receipt_hours": 24,
    "minimum_age": 21,
    "product_eligibility_action": "regulated_retail_purchase"
  }'::jsonb,
  'active'
);
