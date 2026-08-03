-- Canonical production host for Good Trouble retail callback (IAT Scenario A).

UPDATE public.partners
SET allowed_return_urls = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      coalesce(allowed_return_urls, '{}'::text[])
        || ARRAY[
          'https://abraxasworld.xyz/good-trouble/enter'
        ]::text[]
    )
  )
)
WHERE partner_id = 'good-trouble-cannabis';
