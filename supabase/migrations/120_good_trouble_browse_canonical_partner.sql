-- 120_good_trouble_browse_canonical_partner.sql
-- Re-home L0 browse policy to canonical Good Trouble partner (purchase track unchanged).

UPDATE public.partner_policies
SET partner_id = 'good-trouble'
WHERE id = 'good-trouble-browse-v1'
  AND partner_id = 'good-trouble-cannabis'
  AND EXISTS (
    SELECT 1 FROM public.partners WHERE partner_id = 'good-trouble'
  );

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
