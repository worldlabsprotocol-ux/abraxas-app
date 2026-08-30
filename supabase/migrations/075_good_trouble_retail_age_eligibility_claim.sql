-- 075_good_trouble_retail_age_eligibility_claim.sql
-- Good Trouble retail policy: require non-PII product_eligibility=over_21 for minimum_age gate.
--
-- POST-055 (immutability active): in-place active UPDATE is invalid — deferred to migration 076.
-- PRE-055 (legacy): append product_eligibility to active row when absent.
--
-- Production: migration 075 FAILED with P0001 (cannot mutate rules_json) on active good-trouble-retail-v1.1 — do not retry.
-- Fresh environments: immutability shim skips UPDATE; migration 076 creates draft successor.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgname = 'trg_partner_policies_immutability'
       AND tgrelid = 'public.partner_policies'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE NOTICE '075: immutability active — product_eligibility deferred to migration 076 (draft successor)';
    RETURN;
  END IF;

  UPDATE public.partner_policies
  SET rules_json = jsonb_set(
    rules_json,
    '{required_claims}',
    COALESCE(rules_json->'required_claims', '[]'::jsonb)
      || '[{"claim_type":"product_eligibility","must_equal":"over_21","max_age_hours":8760,"min_assurance":"L2"}]'::jsonb
  )
  WHERE id = 'good-trouble-retail-v1'
    AND partner_id = 'good-trouble-cannabis'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(rules_json->'required_claims', '[]'::jsonb)) elem
      WHERE elem->>'claim_type' = 'product_eligibility'
    );
END $$;
