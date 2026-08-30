-- 076_good_trouble_retail_product_eligibility_draft_rollback.sql
-- Removes ONLY the draft successor created by migration 076.
-- Never mutates active or deprecated policy versions (055 immutability contract).
--
-- Safe when the draft has not yet been published via publish_partner_policy_draft.

DELETE FROM public.partner_policies pp
WHERE pp.id = 'good-trouble-retail-v1'
  AND pp.partner_id = 'good-trouble-cannabis'
  AND pp.status = 'draft'
  AND EXISTS (
    SELECT 1
      FROM jsonb_array_elements(COALESCE(pp.rules_json->'required_claims', '[]'::jsonb)) elem
     WHERE elem->>'claim_type' = 'product_eligibility'
       AND elem->>'must_equal' = 'over_21'
       AND COALESCE((elem->>'max_age_hours')::int, 8760) = 8760
       AND COALESCE(elem->>'min_assurance', 'L2') = 'L2'
  )
  AND NOT EXISTS (
    SELECT 1
      FROM public.partner_policies active
     WHERE active.id = pp.id
       AND active.status = 'active'
       AND EXISTS (
         SELECT 1
           FROM jsonb_array_elements(COALESCE(active.rules_json->'required_claims', '[]'::jsonb)) elem
          WHERE elem->>'claim_type' = 'product_eligibility'
            AND elem->>'must_equal' = 'over_21'
       )
  );
