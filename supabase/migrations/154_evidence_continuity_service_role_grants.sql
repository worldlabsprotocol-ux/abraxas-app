-- 154_evidence_continuity_service_role_grants.sql
-- Demo/operational store: service_role must read reuse derivations and write evidence dependency rows.
-- Idempotent GRANTs for environments where 093/113 were applied without PostgREST privileges.

GRANT SELECT ON public.reusable_eligibility_derivations TO postgres, service_role;
GRANT SELECT ON public.reusable_eligibility_facts TO postgres, service_role;
GRANT SELECT, INSERT ON public.decision_receipt_evidence_dependencies TO postgres, service_role;
