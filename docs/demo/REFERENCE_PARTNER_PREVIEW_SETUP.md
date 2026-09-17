# Reference Partner Preview Setup

The reference partner starts Good Trouble's L0 browse policy and returns to an Abraxas-controlled callback:

```text
https://YOUR_PREVIEW_HOST/demo/reference-partner/browse-callback
```

Before using the full browser flow on a new Preview deployment, an operator must add that **exact** URL to the DEMO partner row for `good-trouble-cannabis`.

Run on DEMO Supabase `ocntwbxarpjeixdnzide` only. Do not run on MAIN or Production.

```sql
update public.partners
set allowed_return_urls = array_append(
  coalesce(allowed_return_urls, '{}'::text[]),
  'https://YOUR_PREVIEW_HOST/demo/reference-partner/browse-callback'
)
where partner_id = 'good-trouble-cannabis'
  and not (
    'https://YOUR_PREVIEW_HOST/demo/reference-partner/browse-callback' = any(coalesce(allowed_return_urls, '{}'::text[]))
  );
```

Exact callbacks are intentional. Do not add a wildcard or a broad origin-only allowlist. The route validates a signed L0 browse receipt and then proves that the same receipt is rejected for `good-trouble-retail-v1`.
