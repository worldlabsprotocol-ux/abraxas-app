# zkLogin register HTTP 500 — live audit RCA (PR #293)

**First live failure:** `POST /api/auth/zklogin/register` → HTTP 500 during Google sign-in on Vercel Preview.

## Deployment context

| Item | Value |
|------|-------|
| Preview SHA (at failure) | `7c71ee21` |
| DEMO Supabase (audit target) | `ocntwbxarpjeixdnzide` — `service_role` INSERT on `sui_zklogin_identities` **granted** |
| MAIN Supabase | `bztwutzprwsdrtqdpymf` — **not queried or modified** |

## Root cause (server-side)

The register route persists new Google users with:

```text
POST /api/auth/zklogin/register → verifyGoogleZkLoginIdToken → sui_zklogin_identities UPSERT
```

HTTP 500 with body `Failed to save identity` is emitted only when the Supabase upsert returns an error (not on wallet-binding repair paths, which return 200 with `wallet_binding_status: failed`).

Per `docs/PR257_RELEASE_GATE.md`, **Vercel Preview historically shares staging Supabase `bztwutzprwsdrtqdpymf`**, not DEMO `ocntwbxarpjeixdnzide`. Migration `065_service_role_runtime_grants.sql` (explicit `service_role` INSERT on `sui_zklogin_identities`) is authorized for **DEMO only** and is **not** auto-applied to production/staging on deploy.

**Correlation:** Preview bound to production ref + missing `065` grants → Postgres `42501 permission denied` on upsert → generic HTTP 500.

Wallet extension warnings in Chromium are unrelated (client-side only).

## Fix

### DEMO configuration (required for live audit — no MAIN changes)

Set **Vercel Preview** environment variables for PR #293 preview deployments:

| Variable | Required value |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ocntwbxarpjeixdnzide.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DEMO anon key (from Supabase dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | DEMO service role key (from Supabase dashboard) |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Server audience verification |
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Browser OAuth client |

Redeploy preview after saving. Do **not** point preview at `bztwutzprwsdrtqdpymf` for this audit.

### Application (PR #293)

- Fail fast on preview + production Supabase ref → HTTP 503 `preview_supabase_not_demo_bound`
- Classify upsert errors → `identity_save_permission_denied` (42501), etc.
- Top-level try/catch → `register_internal_error` without leaking tokens/PII

## Regression tests

- `lib/auth/zkloginRegisterRoute.test.ts` — preview binding + permission denied
- `lib/auth/zkloginIdentitySaveError.test.ts` — error classification
