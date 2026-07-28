-- 051_identity_biometric_service_update.sql
-- Admin review updates reviewer_decision on identity_biometric_assessments (service role).

grant update on public.identity_biometric_assessments to service_role;
