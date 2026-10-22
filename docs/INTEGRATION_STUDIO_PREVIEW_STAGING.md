# Integration Studio — Preview staging parity

## Symptom

Vercel **Preview** deployments can provision sandbox applications (Supabase + service role are present) but **`POST /api/launchpad/auth/session` returns HTTP 503** with `launchpad_not_configured` after a **valid** API key is presented.

Invalid keys still return **401** on Preview and Production — partner authentication is wired; only **session JWT minting** is missing.

## Root cause

Partner Launchpad console sessions are signed with a **domain-separated key** derived from:

| Variable | Minimum | Purpose |
|----------|---------|---------|
| `ABRAXAS_BROWSER_SESSION_SECRET` | 16 characters | HMAC input for partner console HttpOnly cookies |

Implementation: `lib/partner/launchpad/partnerConsoleSessionSecret.ts` (not `ABRAXAS_SIGNING_KEY`).

When this variable is unset on Preview, `issuePartnerConsoleSessionToken()` returns `null` and the session route fails closed with 503. Browser-first Integration Studio then cannot attach a session on Preview even though sandbox create succeeds.

## Permitted remediation (do not copy Production secrets)

1. **Generate a new Preview-only secret** (≥32 random bytes, base64 or hex — not reused from Production).
2. In Vercel → **abraxas-app** → Settings → Environment Variables:
   - Name: `ABRAXAS_BROWSER_SESSION_SECRET`
   - Environments: **Preview** only (optionally Development)
   - Value: the new Preview-only secret
3. Redeploy Preview (or merge any commit to refresh previews).
4. Verify:
   - Create sandbox on a Preview URL → **Session active** without manual paste
   - `POST /api/launchpad/auth/session` with a valid sandbox key → **200** (not 503)

Production should retain its **existing** Production-scoped secret. Preview and Production session cookies must not be interchangeable — separate secrets enforce that at issuance time.

## Operator checklist

- [ ] Confirm Production has `ABRAXAS_BROWSER_SESSION_SECRET` (Production target only).
- [ ] Add **distinct** Preview value (never paste Production into Preview).
- [ ] Run `tests/staging/integration-studio-provisioned-e2e.spec.ts` against the Preview URL with `VERCEL_PROTECTION_BYPASS` if deployment protection is enabled.

## Related

- `docs/LAUNCHPAD_DEPLOYMENT.md` — required configuration table
- `docs/demo/DEMO_VARIABLE_MATRIX.md` — browser session variable scope
