-- 075_good_trouble_retail_age_eligibility_claim.sql
-- Good Trouble retail policy: require non-PII product_eligibility=over_21 for minimum_age gate.
-- Do not apply in operator environments until explicitly approved.

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
