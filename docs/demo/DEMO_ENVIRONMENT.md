# DEMO environment

DEMO is the same public Abraxas product as Production, with isolated DEMO data and testnet resources. It is not a judge portal and not a reduced feature set.

Public origin: `https://demo.abraxasworld.xyz`

OAuth callback: `https://demo.abraxasworld.xyz/auth/zklogin/callback`

## Binding

DEMO behavior comes from origin and runtime:

- `ABRAXAS_RUNTIME_ENV=demo`
- `NEXT_PUBLIC_APP_URL=https://demo.abraxasworld.xyz`
- `ABRAXAS_ISSUER_URL=https://demo.abraxasworld.xyz`
- DEMO Supabase project ref `ocntwbxarpjeixdnzide` on `NEXT_PUBLIC_SUPABASE_URL`

Obsolete flags must be removed after deploy. They no longer enable or disable product capabilities:

- `ABRAXAS_JUDGE_DEMO`
- `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO`

## Google sign-in on DEMO

The homepage message “Google sign-in is not configured for this environment.” means the DEMO client bundle is missing a public Google client id. The app does not invent one.

Required non-secret names on Vercel custom environment `demo`:

- `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID`
- Optional recovery: `NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID`
- `NEXT_PUBLIC_APP_URL`
- `ABRAXAS_ISSUER_URL`
- `ABRAXAS_RUNTIME_ENV`

Google Cloud authorized redirect URI:

- `https://demo.abraxasworld.xyz/auth/zklogin/callback`

Do not print client secrets. Do not add Preview `*.vercel.app` aliases as the DEMO callback.

## Circle testnet on DEMO

Required non-secret names on environment `demo` only (never Production):

- `CIRCLE_ARC_TESTNET_ENABLED`
- `CIRCLE_API_KEY` (test prefix only)
- `CIRCLE_ENTITY_SECRET`
- `CIRCLE_WALLET_SET_ID`
- `CIRCLE_DEMO_SOURCE_WALLET_ID`
- `CIRCLE_DEMO_DESTINATION_WALLET_ID`

Submit stays receipt-gated and requires explicit confirmation. Funds never move automatically.

## Vercel cleanup after this PR is deployed

On the `demo` environment only:

1. Delete `ABRAXAS_JUDGE_DEMO` if present.
2. Delete `NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO` if present.
3. Confirm `NEXT_PUBLIC_APP_URL` and `ABRAXAS_ISSUER_URL` are `https://demo.abraxasworld.xyz`.
4. Confirm `ABRAXAS_RUNTIME_ENV=demo`.
5. Confirm Google and Circle names above are set on `demo`, not Production.
6. Redeploy the `demo` environment.

On Production: never set DEMO Supabase, Circle testnet credentials, or the obsolete judge flags.

## Public routes

`/judge-demo` and `/api/judge-demo/environment` remain 404. Use `/`, `/passport`, `/docs`, `/developers`, `/verify`, and `/verification`.
