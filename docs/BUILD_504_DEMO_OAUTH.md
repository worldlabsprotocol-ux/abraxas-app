# Build #504 — Demo deployment OAuth requirements

## Observed deployment

Preview example: `https://abraxas-q5yu1ub5r-worldlabsprotocol-uxs-projects.vercel.app`

## Redirect URI (Google Cloud Console)

For **this preview host**, authorize:

```text
https://abraxas-q5yu1ub5r-worldlabsprotocol-uxs-projects.vercel.app/auth/zklogin/callback
```

For canonical **demo** host (`demo.abraxasworld.xyz`), the app uses the pinned callback documented in `lib/product/demoRuntime.ts`:

```text
https://demo.abraxasworld.xyz/auth/zklogin/callback
```

**Mismatch symptom:** Google redirect succeeds but Abraxas shows sign-in expired, or callback never completes.

## Vercel environment

- `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` — Web client id
- `ABRAXAS_BROWSER_SESSION_SECRET` or `ABRAXAS_SIGNING_KEY` — OAuth state signing
- `NEXT_PUBLIC_SUPABASE_URL` + keys — demo project `ocntwbxarpjeixdnzide` on Demo (never production `bztwutzprwsdrtqdpymf`)
- Optional: `NEXT_PUBLIC_APP_URL` / `ABRAXAS_RUNTIME_ENV=demo` — must align with the browser origin users actually visit

## Holder return after sign-in (Build #504)

zkLogin OAuth state may carry an allowlisted `continue_path` (e.g. `/cielo/verified-rate`) so holders return to the Cielo flow instead of `/passport` only.

Allowed paths: `lib/auth/holderContinuePath.ts`.

## Operator action checklist

1. Add the **exact preview origin** redirect URI in Google OAuth client.
2. Confirm Vercel env vars on the Demo/preview deployment.
3. Open `/cielo/verified-rate` → **Continue with Google** → confirm return to same path with session.
4. Do not use private browsing (ephemeral storage breaks zkLogin pending keys).
