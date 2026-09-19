# Judge Demo deployment contract

Public judge visibility is a **release requirement**. `main` is the only release source of truth.

| Host | Role |
|------|------|
| `https://abraxasworld.xyz` | Public **product**. Production data and Production secrets only. |
| `https://demo.abraxasworld.xyz` | Public **judge / DEMO** surface. DEMO Supabase `ocntwbxarpjeixdnzide` only. |
| Git Preview `*.vercel.app` | **Engineering-only**. Vercel SSO. Never the judge URL. Never the only way to view a feature. |

This document is the repository-side contract. It does **not** deploy, change Vercel, change Google OAuth, apply SQL, or touch MAIN/Production by itself.

## Current Vercel facts (audit)

| Item | Observed / required |
|------|---------------------|
| Project | `abraxas-app` (`prj_89NiVgA4I28AJTuapWlzuKJ4KgQ0`) |
| Custom environment | slug `demo`, id `env_OILNDL1XzhouauSEnyVNGapIKsY2`, type `preview` |
| Description | Isolated presenter demo. No production data or credentials. |
| Branch matcher | **equals `main`**. Leave it on `main`. Never retarget `demo` to a feature branch. |
| Custom domain | `demo.abraxasworld.xyz` (verified), attached to environment `demo` only |
| Extra alias | `abraxas-app-env-demo-worldlabsprotocol-uxs-projects.vercel.app` (engineering; not the judge URL) |
| SSO / Deployment Protection | `ssoProtection.enabled=true`, `deploymentType=all_except_custom_domains` — custom domain is excluded from Vercel SSO |
| Production domain | `abraxasworld.xyz` (public product; never attach Judge Demo flags here) |

Existing custom-environment keys (values not decrypted in this audit): `NEXT_PUBLIC_APP_URL`, `ABRAXAS_ISSUER_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY`, `ABRAXAS_SIGNING_KEY_ID`, `ABRAXAS_BROWSER_SESSION_SECRET`, `ADMIN_PIN`, `PARTNER_SANDBOX_DEMO_ENABLED`, `PARTNER_SANDBOX_DEMO_SUBJECT_ID`.

**Missing for Judge Demo runtime** until an operator sets them on custom environment `demo` only, **after** the approved `main` deploy:

- `ABRAXAS_JUDGE_DEMO=true`
- `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO=true`
- `ABRAXAS_RUNTIME_ENV=demo`
- Google zkLogin client ids (if Passport sign-in is in the judge script)
- Optional Circle **display** vars (`CIRCLE_ARC_TESTNET_ENABLED=true` plus DEMO testnet credentials). Submit remains blocked in Judge Demo even if credentials exist.

Never set Judge Demo flags, Circle testnet secrets, or DEMO keys on Production.

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

Register **exactly** this Authorized redirect URI in the **DEMO** Google Cloud OAuth client:

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

Do **not** set: Production Supabase URL/keys, Production signing keys, Production `ADMIN_PIN`, `INTERNAL_API_SECRET`, Production Circle wallets, Judge Demo flags on Production.

After saving public (`NEXT_PUBLIC_*`) vars, **redeploy** custom environment `demo` from **`main`**.

## Deployment command / branch process

Judges see `main` through the `demo` custom environment. Do **not** retarget `demo` to a feature branch. Do **not** use Git Preview as the judge URL.

1. Merge the approved release PR to **`main`**.
2. Wait for Vercel **Production** (`abraxasworld.xyz`) and custom environment **`demo`** (tracking `main`) to deploy that SHA.
3. Confirm **demo** branch matcher is still **equals `main`**.
4. Confirm domain **demo.abraxasworld.xyz** stays attached to environment `demo` only.
5. Confirm **Deployment Protection** remains SSO for **all except custom domains**.
6. Set the Judge Demo flags on environment `demo` only, then **redeploy `demo`** (not Production).

CLI must not target Production:

```bash
# Operators may inspect the demo environment after main has deployed.
# Do not vercel deploy --prod. Do not change the demo branch matcher.
```

## Public product routes

Banner: “DEMO environment · Test data · Testnet transfer submission is disabled”

| Path | Purpose |
|------|---------|
| `/` | Homepage |
| `/judge-demo` | 404 on both origins. Not a product entry. |
| `/passport` | Passport |
| `/good-trouble` | Good Trouble |
| `/docs/partner-flow` | Partner Flow docs |
| `/docs/policy-packs` | Policy packs |
| `/docs/integration-kit` | Integration kit |
| `/developers/launchpad` | Launchpad / sandbox evidence |
| `/docs/circle-arc-testnet` | Settlement evidence docs |
| `/api/judge-demo/environment` | Public DEMO identity JSON |

Circle: GET evidence and pending intents may display. `POST .../settlement/submit` returns `judge_demo_transfer_blocked`. The Launchpad UI hides Submit. No wallet IDs, secrets, PII, or raw provider payloads in public views.

Production never requires Circle migrations `089` or `090`. Circle stays blocked when `VERCEL_ENV=production`.

## Public smoke-test checklist

Run **unauthenticated** against `https://demo.abraxasworld.xyz` (no Vercel bypass cookie):

1. `GET /` — 200, sandbox banner visible, not a Vercel SSO login
2. `GET /judge-demo` — 404 on both origins
3. `GET /passport`, `/good-trouble`, `/docs/partner-flow`, `/docs/policy-packs`, `/docs/integration-kit`, `/developers/launchpad` — 200 HTML
4. `GET /api/judge-demo/environment` — 200 JSON: `ok=true`, `origin=https://demo.abraxasworld.xyz`, `oauth_callback=https://demo.abraxasworld.xyz/auth/zklogin/callback`, `supabase_project_ref=ocntwbxarpjeixdnzide`, `supabase_bound_to_demo=true`, `runtime_env=demo`, `runtime_marker_non_production=true`, `circle_submit_allowed=false`, `engineering_preview_only=false`, `sso_not_required_on_custom_domain=true`
5. JSON must not contain JWTs, `service_role`, wallet ids, or API keys
6. Optional Passport Google start uses redirect_uri exactly the one URI above
7. Git Preview URL still shows Vercel SSO — engineering-only
8. `https://abraxasworld.xyz/api/judge-demo/environment` is 404 and has no judge banner

## Rollback

1. Instant Rollback the previous **demo** deployment that came from `main` (not Production)
2. Keep the **demo** branch matcher on **`main`**
3. Unset `ABRAXAS_JUDGE_DEMO` and `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO` on environment `demo` if the contract must go dark, then redeploy `demo`
4. Leave Production, MAIN Supabase, and Google Production clients untouched
5. Confirm `https://abraxasworld.xyz` still serves Production

## Operator actions still required (this PR does not perform them)

- Merge to `main` only after CI is green (not done by the agent that opened this PR unless a human approves merge)
- Apply `091_partner_flow_continuations.sql` to Production before or with the Production app
- Do **not** apply `089` or `090` to Production
- After `main` is on both Production and `demo`, set Judge Demo flags on **`demo` only**
- Register the single DEMO Google callback URI
- Redeploy `demo` from `main`
- Smoke-test both public hosts
