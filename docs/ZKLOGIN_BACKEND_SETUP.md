# zkLogin backend setup — plain English checklist

This guide is for wiring **Abraxas verification on Sui** when you have never set up zkLogin before. Do the steps in order.

## The big picture

1. User clicks **Continue with Google** on `/passport`.
2. Google returns a JWT to your app.
3. Your server stores a random **salt** and computes a **Sui address**.
4. That address is the user's **Passport holder ID**.
5. After Veriff approves, backend **issues stamps** on their Sui Passport object.

## Step 1 — Google OAuth

**Where:** [Google Cloud Console](https://console.cloud.google.com/) → Credentials

- Create OAuth Web client
- Origins: `http://localhost:3000`, `https://abraxas-app.vercel.app`
- Redirect: `…/auth/zklogin/callback`
- Env: `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID`

## Step 2 — Supabase

Run `supabase/migrations/007_sui_zklogin.sql`

Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Step 3 — Test sign-in

`/passport` → Google → `/auth/zklogin/callback` → check `sui_zklogin_identities`

## Step 4 — Veriff

Env: `VERIFF_API_KEY`, `VERIFF_SECRET`  
Webhook: `https://abraxas-app.vercel.app/api/idv/webhook`

## Step 5 — Signing keys

`node scripts/generate-abraxas-key.js` → `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY`

## Step 6 — On-chain stamps (you build next)

- `npm run sui:deploy:devnet`
- After Veriff: call Move `issue_stamps_entry`, store object ID per `sui_address`

## Step 7 — Prover (transactions only)

`NEXT_PUBLIC_ZKLOGIN_PROVER_URL=https://prover-dev.mystenlabs.com/v1`

See also `/docs/zklogin-setup` in the app.
