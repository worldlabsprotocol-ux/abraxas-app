-- 076_good_trouble_retail_product_eligibility_draft.sql
-- Good Trouble retail: successor draft with product_eligibility=over_21 required claim.
--
-- Supersedes failed migration 075 (in-place active UPDATE violates 055 immutability).
-- Preserves the active policy byte-for-byte; inserts the next monotonic draft version only.
-- Does NOT publish, reassign partners, or mutate Production data in this batch.
--
-- Operator activation (separate approval):
--   select public.publish_partner_policy_draft('good-trouble-retail-v1', <draft_version>);

DO $$
DECLARE
  v_active public.partner_policies%rowtype;
  v_next_version int;
  v_new_rules jsonb;
  v_has_eligibility boolean;
BEGIN
  SELECT *
    INTO v_active
    FROM public.partner_policies
   WHERE id = 'good-trouble-retail-v1'
     AND partner_id = 'good-trouble-cannabis'
     AND status = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE '076: good-trouble-retail-v1 active policy not found — skipping draft creation';
    RETURN;
  END IF;

  IF (
    SELECT count(*)::int
      FROM public.partner_policies
     WHERE id = 'good-trouble-retail-v1'
       AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION '076: ambiguous state — expected exactly one active version for good-trouble-retail-v1';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.partner_policies d
     WHERE d.id = 'good-trouble-retail-v1'
       AND d.status = 'draft'
       AND NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements(COALESCE(d.rules_json->'required_claims', '[]'::jsonb)) elem
          WHERE elem->>'claim_type' = 'product_eligibility'
            AND elem->>'must_equal' = 'over_21'
            AND COALESCE((elem->>'max_age_hours')::int, 8760) = 8760
            AND COALESCE(elem->>'min_assurance', 'L2') = 'L2'
       )
  ) THEN
    RAISE EXCEPTION '076: ambiguous state — unrelated draft exists for good-trouble-retail-v1';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(COALESCE(v_active.rules_json->'required_claims', '[]'::jsonb)) elem
     WHERE elem->>'claim_type' = 'product_eligibility'
       AND elem->>'must_equal' = 'over_21'
       AND COALESCE((elem->>'max_age_hours')::int, 8760) = 8760
       AND COALESCE(elem->>'min_assurance', 'L2') = 'L2'
  ) INTO v_has_eligibility;

  IF v_has_eligibility THEN
    RAISE NOTICE '076: active good-trouble-retail-v1 already contains product_eligibility=over_21 — skipping';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.partner_policies d
     WHERE d.id = 'good-trouble-retail-v1'
       AND d.status = 'draft'
       AND EXISTS (
         SELECT 1
           FROM jsonb_array_elements(COALESCE(d.rules_json->'required_claims', '[]'::jsonb)) elem
          WHERE elem->>'claim_type' = 'product_eligibility'
            AND elem->>'must_equal' = 'over_21'
            AND COALESCE((elem->>'max_age_hours')::int, 8760) = 8760
            AND COALESCE(elem->>'min_assurance', 'L2') = 'L2'
       )
  ) THEN
    RAISE NOTICE '076: draft with product_eligibility already exists for good-trouble-retail-v1 — idempotent skip';
    RETURN;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM public.partner_policies
   WHERE id = 'good-trouble-retail-v1';

  IF EXISTS (
    SELECT 1
      FROM public.partner_policies
     WHERE id = 'good-trouble-retail-v1'
       AND version = v_next_version
  ) THEN
    RAISE NOTICE '076: version % already exists for good-trouble-retail-v1 — idempotent skip', v_next_version;
    RETURN;
  END IF;

  v_new_rules := jsonb_set(
    v_active.rules_json,
    '{required_claims}',
    COALESCE(v_active.rules_json->'required_claims', '[]'::jsonb)
      || '[{"claim_type":"product_eligibility","must_equal":"over_21","max_age_hours":8760,"min_assurance":"L2"}]'::jsonb
  );

  INSERT INTO public.partner_policies (
    id,
    partner_id,
    version,
    name,
    rules_json,
    status,
    effective_at
  ) VALUES (
    v_active.id,
    v_active.partner_id,
    v_next_version,
    v_active.name,
    v_new_rules,
    'draft',
    now()
  );

  RAISE NOTICE '076: created draft good-trouble-retail-v1 v% with product_eligibility claim', v_next_version;
END $$;
