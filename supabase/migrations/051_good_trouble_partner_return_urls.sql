-- Good Trouble reference partner: return URLs + session receipt TTL on policy

UPDATE public.partners
SET allowed_return_urls = ARRAY[
  'https://goodtrouble.live',
  'https://www.goodtrouble.live',
  'http://localhost:3000/good-trouble/enter',
  'https://abraxas-app.vercel.app/good-trouble/enter'
]::text[]
WHERE partner_id = 'good-trouble-cannabis';

UPDATE public.partner_policies
SET rules_json = rules_json || jsonb_build_object(
  'session_receipt_hours', 24,
  'minimum_age', 21,
  'product_eligibility_action', 'regulated_retail_purchase',
  'account_required', true,
  'consent_required', true
)
WHERE id = 'good-trouble-retail-v1'
  AND partner_id = 'good-trouble-cannabis';
