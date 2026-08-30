-- 075_good_trouble_retail_age_eligibility_claim_rollback.sql
-- Rollback ONLY the exact product_eligibility rule introduced by migration 075.
--
-- IMPORTANT: Even after this rollback, evaluatePolicyRules continues to enforce
-- minimum_age via expandRequiredClaimsForMinimumAge() in application code until
-- the corresponding code path is rolled back separately. Removing the DB rule
-- alone does NOT disable age enforcement while minimum_age: 21 remains in rules_json.

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
