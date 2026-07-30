// FILE: supabase/migrations/050_good_trouble_biometric_thresholds.sql
// Good Trouble retail policy: partner-specific biometric capture thresholds.

update public.partner_policies
set rules_json = rules_json || '{
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
  "retail_minimum_age": 21
}'::jsonb
where id = 'good-trouble-retail-v1';
