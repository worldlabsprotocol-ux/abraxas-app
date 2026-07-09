-- 027_partner_verify_requests_scope.sql
-- Add verify:requests scope to existing partner API keys.

update public.partner_api_keys
set scopes = array(
  select distinct unnest(scopes || array['verify:requests']::text[])
)
where not ('verify:requests' = any(scopes));
