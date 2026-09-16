# Partner Launchpad staging smoke test

Reusable Playwright and API walkthrough for PR #290 against an explicit Vercel preview bound to the **demo** Supabase project.

## Required environment

| Variable | Description |
|---|---|
| `LAUNCHPAD_STAGING_URL` | HTTPS preview URL (must not be production) |
| `LAUNCHPAD_EXPECTED_SUPABASE_REF` | Demo Supabase project ref (`ocntwbxarpjeixdnzide`) |

## Optional environment

| Variable | Description |
|---|---|
| `VERCEL_PROTECTION_BYPASS` | Vercel deployment protection bypass token |
| `LAUNCHPAD_ADMIN_PIN` | Admin PIN for production approval steps 24–26 |
| `PLAYWRIGHT_STORAGE_STATE` | Path to saved Playwright storage state after operator SSO |

## Authentication setup

Partner Launchpad console authentication uses a sandbox API key (`abx_test_…`) issued during provisioning. The smoke test provisions its own tagged application and never prints full keys in reports.

Before any mutations, the harness calls `GET /api/launchpad/staging/environment` (preview-only) to confirm the server-configured demo Supabase project ref matches `LAUNCHPAD_EXPECTED_SUPABASE_REF`. The expected ref is never trusted without this independent server confirmation.

If the Vercel preview has Deployment Protection enabled:

1. Open the preview URL in a browser and complete the Vercel SSO prompt once.
2. Copy the deployment protection bypass token from Vercel project settings, or save Playwright storage state after login.
3. Re-run with `VERCEL_PROTECTION_BYPASS` or `PLAYWRIGHT_STORAGE_STATE`.

Hosted verification end-user auth (Google / zkLogin) is not required for the sandbox test console scenarios.

## Commands

```bash
export LAUNCHPAD_STAGING_URL="https://your-preview.vercel.app"
export LAUNCHPAD_EXPECTED_SUPABASE_REF="ocntwbxarpjeixdnzide"

npm run smoke:launchpad:staging
```

Playwright spec only:

```bash
npx playwright test tests/staging/launchpad-staging-smoke.spec.ts
```

## Output

Sanitized Markdown report:

`reports/launchpad-staging-smoke/<test-id>.md`

Screenshots (credentials masked):

`reports/launchpad-staging-smoke/screenshots/<test-id>/`

## Safety

- Fails closed when the target is missing, non-HTTPS, production host, or Supabase ref mismatch.
- Never logs API keys, cookies, tokens, or authorization headers.
- Does not apply migrations or mutate production Supabase.
