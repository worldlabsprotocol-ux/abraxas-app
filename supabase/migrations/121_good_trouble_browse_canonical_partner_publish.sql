-- 121_good_trouble_browse_canonical_partner_publish.sql
-- Forward-safe canonical browse ownership for good-trouble-browse-v1.
--
-- Supersedes the defective 120 partner_policies UPDATE (immutable active rows).
-- Preserves legacy good-trouble-cannabis v1 as deprecated history; activates
-- a new draft version owned by canonical good-trouble via publish_partner_policy_draft.
--
-- Prerequisite: 055_policy_immutable_versions.sql, 056_publish_partner_policy_draft_rpc.sql,
--               081_self_attestation_ledger.sql, canonical partner good-trouble provisioned.

DO $$
DECLARE
  v_active public.partner_policies%rowtype;
  v_next_version int;
  v_canonical_partner constant text := 'good-trouble';
  v_legacy_partner constant text := 'good-trouble-cannabis';
  v_policy_id constant text := 'good-trouble-browse-v1';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partners WHERE partner_id = v_canonical_partner
  ) THEN
    RAISE NOTICE '121: canonical partner % not provisioned — skipping browse publish', v_canonical_partner;
    RETURN;
  END IF;

  SELECT *
    INTO v_active
    FROM public.partner_policies
   WHERE id = v_policy_id
     AND status = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE '121: no active % policy — skipping', v_policy_id;
    RETURN;
  END IF;

  IF v_active.partner_id = v_canonical_partner THEN
    RAISE NOTICE '121: active % already owned by % — idempotent skip', v_policy_id, v_canonical_partner;
    RETURN;
  END IF;

  IF v_active.partner_id <> v_legacy_partner THEN
    RAISE EXCEPTION '121: unexpected active owner % for % (expected %)',
      v_active.partner_id, v_policy_id, v_legacy_partner;
  END IF;

  IF (
    SELECT count(*)::int
      FROM public.partner_policies
     WHERE id = v_policy_id
       AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION '121: ambiguous state — expected exactly one active version for %', v_policy_id;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.partner_policies
     WHERE id = v_policy_id
       AND status = 'draft'
       AND partner_id <> v_canonical_partner
  ) THEN
    RAISE EXCEPTION '121: unrelated draft exists for % — operator review required', v_policy_id;
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
      v_active.name,
      v_active.rules_json,
      'draft'
    );
    RAISE NOTICE '121: inserted draft % v% for partner %', v_policy_id, v_next_version, v_canonical_partner;
  ELSE
    IF NOT EXISTS (
      SELECT 1
        FROM public.partner_policies
       WHERE id = v_policy_id
         AND version = v_next_version
         AND partner_id = v_canonical_partner
         AND status = 'draft'
    ) THEN
      RAISE EXCEPTION '121: version % exists but is not the expected canonical draft', v_next_version;
    END IF;
    RAISE NOTICE '121: canonical draft % v% already exists — idempotent skip insert', v_policy_id, v_next_version;
  END IF;

  PERFORM public.publish_partner_policy_draft(v_policy_id, v_next_version);
  RAISE NOTICE '121: published % v% (deprecated legacy v%)', v_policy_id, v_next_version, v_active.version;
END $$;

-- Post-condition probe: active browse policy must be canonical when publish succeeded.
DO $$
DECLARE
  v_active public.partner_policies%rowtype;
BEGIN
  SELECT *
    INTO v_active
    FROM public.partner_policies
   WHERE id = 'good-trouble-browse-v1'
     AND status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.partners WHERE partner_id = 'good-trouble')
     AND v_active.partner_id <> 'good-trouble' THEN
    RAISE EXCEPTION '121: post-condition failed — active browse policy owner is %', v_active.partner_id;
  END IF;
END $$;
