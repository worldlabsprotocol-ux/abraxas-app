-- 075_good_trouble_retail_age_eligibility_claim_rollback.sql
-- Rollback ONLY the exact product_eligibility rule introduced by migration 075.
--
-- POST-055: migration 075 is a no-op shim — nothing to roll back. Use 076 rollback instead.
-- PRE-055: removes the legacy in-place product_eligibility append when present.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgname = 'trg_partner_policies_immutability'
       AND tgrelid = 'public.partner_policies'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE NOTICE '075 rollback: immutability active — no-op (use 076 rollback for draft successor)';
    RETURN;
  END IF;

  UPDATE public.partner_policies
  SET rules_json = jsonb_set(
    rules_json,
    '{required_claims}',
    COALESCE(
      (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(COALESCE(rules_json->'required_claims', '[]'::jsonb)) elem
        WHERE NOT (
          elem->>'claim_type' = 'product_eligibility'
          AND elem->>'must_equal' = 'over_21'
          AND (elem->>'max_age_hours')::int = 8760
          AND elem->>'min_assurance' = 'L2'
        )
      ),
      '[]'::jsonb
    )
  )
  WHERE id = 'good-trouble-retail-v1'
    AND partner_id = 'good-trouble-cannabis';
END $$;
