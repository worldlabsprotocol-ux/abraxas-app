-- 120_good_trouble_browse_canonical_partner.sql
-- Repaired: original partner_policies.partner_id UPDATE violated 055/088 immutability.
-- Canonical browse ownership transfer is handled in 121 via draft + publish_partner_policy_draft.
--
-- Idempotent callback allowlisting only (safe on re-run).

UPDATE public.partners
SET allowed_return_urls = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_return_urls, ARRAY[]::text[])
        || ARRAY[
          'https://www.goodtroublecanna.com/browse-verification-result'
        ]::text[]
    )
  )
)
WHERE partner_id = 'good-trouble';

UPDATE public.partners
SET allowed_return_urls = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_return_urls, ARRAY[]::text[])
        || ARRAY[
          'https://www.goodtroublecanna.com/browse-verification-result'
        ]::text[]
    )
  )
)
WHERE partner_id = 'good-trouble-cannabis';
