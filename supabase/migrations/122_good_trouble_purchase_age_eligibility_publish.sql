-- 122_good_trouble_purchase_age_eligibility_publish.sql
-- Good Trouble canonical purchase pilot: L0 age eligibility (no identity verification).
--
-- Supersedes active good-trouble-age_21_retail-v1 rules that require identity_verified/L2.
-- Preserves historical versions; publishes a new immutable draft via publish_partner_policy_draft.
--
-- Prerequisite: 055_policy_immutable_versions.sql, 056_publish_partner_policy_draft_rpc.sql,
--               081_self_attestation_ledger.sql, canonical partner good-trouble provisioned.

DO $$
DECLARE
  v_active public.partner_policies%rowtype;
  v_next_version int;
  v_canonical_partner constant text := 'good-trouble';
  v_policy_id constant text := 'good-trouble-age_21_retail-v1';
  v_target_rules constant jsonb := '{
    "age_eligibility_only": true,
    "minimum_assurance_cap": "L0",
    "minimum_age": 21,
    "allowed_purposes": ["purchase"],
    "required_claims": [
      {"claim_type": "self_attested_age_band", "must_equal": "over_21", "max_age_hours": 24}
    ],
    "session_receipt_hours": 24,
    "account_required": true,
    "consent_required": true,
    "sandbox_only": false
  }'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partners WHERE partner_id = v_canonical_partner
  ) THEN
    RAISE NOTICE '122: canonical partner % not provisioned — skipping purchase publish', v_canonical_partner;
    RETURN;
  END IF;

  SELECT *
    INTO v_active
    FROM public.partner_policies
   WHERE id = v_policy_id
     AND status = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE '122: no active % policy — skipping', v_policy_id;
    RETURN;
  END IF;

  IF v_active.partner_id <> v_canonical_partner THEN
    RAISE NOTICE '122: active % owned by % — expected % — skipping',
      v_policy_id, v_active.partner_id, v_canonical_partner;
    RETURN;
  END IF;

  IF COALESCE(v_active.rules_json->>'age_eligibility_only', 'false') = 'true' THEN
    RAISE NOTICE '122: active % already age_eligibility_only — idempotent skip', v_policy_id;
    RETURN;
  END IF;

  IF (
    SELECT count(*)::int
      FROM public.partner_policies
     WHERE id = v_policy_id
       AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION '122: ambiguous state — expected exactly one active version for %', v_policy_id;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM public.partner_policies
   WHERE id = v_policy_id;

  IF NOT EXISTS (
    SELECT 1
      FROM public.partner_policies
     WHERE id = v_policy_id
       AND version = v_next_version
  ) THEN
    INSERT INTO public.partner_policies (
      id,
      partner_id,
      version,
      name,
      rules_json,
      status
    )
    VALUES (
      v_policy_id,
      v_canonical_partner,
      v_next_version,
      COALESCE(v_active.name, 'Age 21 eligibility'),
      v_target_rules,
      'draft'
    );
    RAISE NOTICE '122: inserted draft % v% (L0 age eligibility)', v_policy_id, v_next_version;
  ELSE
    IF NOT EXISTS (
      SELECT 1
        FROM public.partner_policies
       WHERE id = v_policy_id
         AND version = v_next_version
         AND partner_id = v_canonical_partner
         AND status = 'draft'
         AND COALESCE(rules_json->>'age_eligibility_only', 'false') = 'true'
    ) THEN
      RAISE EXCEPTION '122: version % exists but is not the expected age eligibility draft', v_next_version;
    END IF;
    RAISE NOTICE '122: age eligibility draft % v% already exists — idempotent skip insert', v_policy_id, v_next_version;
  END IF;

  PERFORM public.publish_partner_policy_draft(v_policy_id, v_next_version);
  RAISE NOTICE '122: published % v% (deprecated identity/L2 v%)', v_policy_id, v_next_version, v_active.version;
END $$;

DO $$
DECLARE
  v_active public.partner_policies%rowtype;
BEGIN
  SELECT *
    INTO v_active
    FROM public.partner_policies
   WHERE id = 'good-trouble-age_21_retail-v1'
     AND status = 'active';

  IF FOUND AND COALESCE(v_active.rules_json->>'age_eligibility_only', 'false') <> 'true' THEN
    RAISE WARNING '122 post-condition: active good-trouble-age_21_retail-v1 is not age_eligibility_only — operator review required';
  END IF;
END $$;
