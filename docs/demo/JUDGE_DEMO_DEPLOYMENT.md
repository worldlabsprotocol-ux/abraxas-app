# Judge Demo deployment contract

Public judge visibility is a **release requirement**. Judges open one stable URL:

`https://demo.abraxasworld.xyz`

That host must show current **approved** Abraxas capabilities backed only by **DEMO** infrastructure (`ocntwbxarpjeixdnzide`). Git Preview aliases (`*.vercel.app` behind Vercel SSO) remain **engineering-only** and are never the only way to view a feature.

This document is the repository-side contract. It does **not** deploy, change Vercel, change Google OAuth, apply SQL, or touch MAIN/Production by itself.

## Current Vercel facts (audit)

| Item | Observed |
|------|----------|
| Project | `abraxas-app` (`prj_89NiVgA4I28AJTuapWlzuKJ4KgQ0`) |
| Custom environment | slug `demo`, id `env_OILNDL1XzhouauSEnyVNGapIKsY2`, type `preview` |
| Description | Isolated presenter demo. No production data or credentials. |
| Branch matcher | **equals `main`** (must be changed to the approved Judge Demo git branch **or** a deployment of that branch must be assigned to this custom environment — do **not** merge to `main` solely to publish a judge surface) |
| Custom domain | `demo.abraxasworld.xyz` (verified) |
| Extra alias | `abraxas-app-env-demo-worldlabsprotocol-uxs-projects.vercel.app` (engineering; not the judge URL) |
| SSO / Deployment Protection | `ssoProtection.enabled=true`, `deploymentType=all_except_custom_domains` — custom domain is already excluded from Vercel SSO |
| Production domain | `abraxasworld.xyz` (do not attach Judge Demo here) |

Existing custom-environment keys (values not decrypted in this audit): `NEXT_PUBLIC_APP_URL`, `ABRAXAS_ISSUER_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY`, `ABRAXAS_SIGNING_KEY_ID`, `ABRAXAS_BROWSER_SESSION_SECRET`, `ADMIN_PIN`, `PARTNER_SANDBOX_DEMO_ENABLED`, `PARTNER_SANDBOX_DEMO_SUBJECT_ID`.

**Missing for Judge Demo runtime** until an operator sets them on custom environment `demo` only:

- `ABRAXAS_JUDGE_DEMO=true`
- `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO=true`
- `ABRAXAS_RUNTIME_ENV=demo`
- Google zkLogin client ids (if Passport sign-in is in the judge script)
- Optional Circle **display** vars (`CIRCLE_ARC_TESTNET_ENABLED=true` plus DEMO testnet credentials). Submit remains blocked in Judge Demo even if credentials exist.

## Fail-closed runtime

When either judge-demo flag is `true`, boot (`instrumentation.ts`) and `/api/judge-demo/environment` require:

1. Public origin exactly `https://demo.abraxasworld.xyz` (`NEXT_PUBLIC_APP_URL` and `ABRAXAS_ISSUER_URL`)
2. Request `Host` / `x-forwarded-host` exactly `demo.abraxasworld.xyz` (no Preview alias)
3. DEMO Supabase ref only: `ocntwbxarpjeixdnzide` on URL, anon JWT `ref`, and service-role JWT `ref`
4. `ABRAXAS_RUNTIME_ENV=demo` (explicit non-production marker)
5. `VERCEL_ENV` is **not** `production`
6. No Production Supabase ref `bztwutzprwsdrtqdpymf`
7. No live Circle `LIVE_API_KEY:` material
8. Server and public flags both `true`

Mismatch fails closed (process throw on boot; identity `503`; zkLogin register `503` `judge_demo_runtime_failed_closed`).

## One Google OAuth URI

Register **exactly** this Authorized redirect URI in the Google Cloud OAuth client used by DEMO:

```
https://demo.abraxasworld.xyz/auth/zklogin/callback
```

Do **not** register per-Preview `*.vercel.app` aliases for Judge Demo. With `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO=true`, the app pins this callback and ignores `window.location` / `VERCEL_URL`.

Authorized JavaScript origin:

```
https://demo.abraxasworld.xyz
```

Do not add Production `https://abraxasworld.xyz` to the DEMO client. Do not point Production Google client at the demo callback.

## Exact Vercel custom-environment variables

Set **only** on environment `demo` (`env_OILNDL1XzhouauSEnyVNGapIKsY2`). Never copy Production secrets.

| Key | Required value / rule |
|-----|------------------------|
| `ABRAXAS_JUDGE_DEMO` | `true` |
| `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO` | `true` |
| `ABRAXAS_RUNTIME_ENV` | `demo` |
| `NEXT_PUBLIC_APP_URL` | `https://demo.abraxasworld.xyz` |
| `ABRAXAS_ISSUER_URL` | `https://demo.abraxasworld.xyz` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ocntwbxarpjeixdnzide.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DEMO project anon JWT (`ref=ocntwbxarpjeixdnzide`) |
| `SUPABASE_SERVICE_ROLE_KEY` | DEMO project service_role JWT (`ref=ocntwbxarpjeixdnzide`) |
| `ABRAXAS_SIGNING_KEY` / `ABRAXAS_PUBLIC_KEY` / `ABRAXAS_SIGNING_KEY_ID` | **Demo-only** keypair (see `docs/demo/DEMO_SIGNING_KEY_BOOTSTRAP.md`) |
| `ABRAXAS_BROWSER_SESSION_SECRET` | Demo-only; not Production |
| `PARTNER_SANDBOX_DEMO_ENABLED` | `true` |
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | DEMO Google client id |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Same DEMO audience |
| `CIRCLE_ARC_TESTNET_ENABLED` | `true` only if displaying settlement evidence; submit still blocked |
| `CIRCLE_API_KEY` | Testnet only; never `LIVE_API_KEY:` |

Do **not** set: Production Supabase URL/keys, Production signing keys, Production `ADMIN_PIN`, `INTERNAL_API_SECRET`, Production Circle wallets.

After saving public (`NEXT_PUBLIC_*`) vars, **redeploy** the custom environment.

## Deployment command / branch process

Do **not** merge to `main` or Production to satisfy judges.

Recommended (dashboard, no CLI required):

1. Open Vercel project **abraxas-app** → **Environments** → **demo**
2. Change **Branch tracking** from `main` to the git branch that contains this Judge Demo contract (and the approved capabilities you intend to show), **or** use **Deployments → Create Deployment** and target environment **demo** with that commit SHA
3. Confirm domain **demo.abraxasworld.xyz** stays attached to `demo` only
4. Confirm **Deployment Protection** remains **Standard Protection / SSO for all except custom domains**
5. Redeploy environment `demo`

CLI equivalent (operator machine; not run by this agent):

```bash
# From the approved git SHA. Target the custom environment, never Production.
vercel deploy --cwd . --scope worldlabsprotocol-uxs-projects
# In the prompt or dashboard, assign the resulting deployment to custom environment "demo"
# or use the project UI "Promote" onto environment demo.
```

Vercel custom environments are not `--target=production`. Never pass Production.

## Judge-visible routes

Banner: “Public Judge Demo · sandbox / DEMO infrastructure only · not Production”

| Path | Purpose |
|------|---------|
| `/` | Homepage |
| `/judge-demo` | Index of judge-visible routes |
| `/passport` | Passport |
| `/good-trouble` | Good Trouble |
| `/docs/partner-flow` | Partner Flow docs |
| `/docs/policy-packs` | Policy packs |
| `/docs/integration-kit` | Integration kit |
| `/developers/launchpad` | Launchpad / sandbox evidence |
| `/docs/circle-arc-testnet` | Settlement evidence docs |
| `/api/judge-demo/environment` | Public identity JSON |

Circle: GET evidence and pending intents may display. `POST .../settlement/submit` returns `judge_demo_transfer_blocked`. The Launchpad UI hides Submit. No wallet IDs, secrets, PII, or raw provider payloads in public views.

## Public smoke-test checklist

Run **unauthenticated** against `https://demo.abraxasworld.xyz` (no Vercel bypass cookie):

1. `GET /` — 200, sandbox banner visible, not a Vercel SSO login
2. `GET /judge-demo` — lists routes
3. `GET /passport`, `/good-trouble`, `/docs/partner-flow`, `/docs/policy-packs`, `/docs/integration-kit`, `/developers/launchpad` — 200 HTML
4. `GET /api/judge-demo/environment` — 200 JSON: `ok=true`, `origin=https://demo.abraxasworld.xyz`, `oauth_callback=https://demo.abraxasworld.xyz/auth/zklogin/callback`, `supabase_project_ref=ocntwbxarpjeixdnzide`, `supabase_bound_to_demo=true`, `runtime_env=demo`, `runtime_marker_non_production=true`, `circle_submit_allowed=false`, `engineering_preview_only=false`, `sso_not_required_on_custom_domain=true`
5. JSON must not contain JWTs, `service_role`, wallet ids, or API keys
6. Optional Passport Google start uses redirect_uri exactly the one URI above
7. Git Preview URL still shows Vercel SSO — engineering-only

## Rollback

1. In Vercel **demo** environment, restore **branch matcher** to `main` (or the last known-good demo SHA)
2. Instant Rollback the previous **demo** deployment (not Production)
3. Unset `ABRAXAS_JUDGE_DEMO` and `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO` if the contract must go dark
4. Leave Production, MAIN Supabase, and Google Production clients untouched
5. Confirm `https://abraxasworld.xyz` still serves Production and `https://demo.abraxasworld.xyz` is no longer on the withdrawn SHA

## Operator actions still required (this PR does not perform them)

- Point custom environment `demo` at the approved non-`main` git SHA
- Set the missing flags and DEMO Google client ids
- Register the single Google callback URI
- Redeploy `demo`
- Smoke-test the public host
