# zkLogin backend setup — plain English checklist

This guide is for wiring **Abraxas verification on Sui** when you have never set up zkLogin before. Do the steps in order.

## The big picture

1. User clicks **Continue with Google** on `/passport`.
2. Google returns a JWT to your app.
3. Your server stores a random **salt** and computes a **Sui address**.
4. That address is the user's **Passport holder ID**.
5. After Veriff approves, backend **issues stamps** on their Sui Passport object.

## Step 1 — Google OAuth

**Where:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Web client

### Authorized JavaScript origins (exact origins, no path)

Add every domain where users open the app:

```
http://localhost:3000
https://abraxas-app.vercel.app
https://abraxas-app-git-cursor-su-6b45a9-worldlabsprotocol-uxs-projects.vercel.app
```

For **each new Vercel preview URL**, add that origin too — or test sign-in only on production.

### Authorized redirect URIs (exact path)

Google rejects sign-in if the redirect URI is missing. Add **all** of these:

```
http://localhost:3000/auth/zklogin/callback
https://abraxas-app.vercel.app/auth/zklogin/callback
https://abraxas-app-git-cursor-su-6b45a9-worldlabsprotocol-uxs-projects.vercel.app/auth/zklogin/callback
```

The app sends `redirect_uri={current-origin}/auth/zklogin/callback`. On a Vercel preview deploy, that origin is the long `git-cursor-…vercel.app` URL — it must match a row above **character for character**.

**Optional — pin production callback (preview deploys redirect to prod after Google):**

In Vercel → Environment Variables:

```
NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI=https://abraxas-app.vercel.app/auth/zklogin/callback
```

Then only the production redirect URI needs to be in Google Console. Users on preview branches land on production after OAuth.

### Env

```
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

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

## Step 6 — On-chain stamps (Phase 2)

Run migration `supabase/migrations/010_sui_passport_objects.sql`

Env (sponsor wallet that owns the Move `IssuanceCap`):

```
SUI_SPONSOR_SECRET_KEY=suiprivkey1…          # export from YOUR wallet (e.g. 0xa4d1…)
SUI_ISSUANCE_CAP_OBJECT_ID=0x…               # from npm run sui:mint-cap — NOT the old demo cap
```

Verify after deploy: `GET /api/sui/passport/sponsor` — should show your wallet address and `cap_owner_matches_sponsor: true`. The old `0xcf8fa9…06ee` deploy wallet is never used when env vars are set.

After Veriff approves, the webhook automatically calls `create_passport` + `issue_stamps_entry` and saves the object ID in `sui_passport_objects`. The `/passport` page shows on-chain status — no manual steps.

Fund the sponsor wallet with devnet SUI: `sui client faucet` (or transfer from your deploy wallet).

## Step 7 — Prover (transactions only)

`NEXT_PUBLIC_ZKLOGIN_PROVER_URL=https://prover-dev.mystenlabs.com/v1`

See also `/docs/sui` in the app.

## Continue from Step 5 (signing keys)

If `node scripts/generate-abraxas-key.js` failed with **non-extractable CryptoKey**, pull latest main/PR — the script now uses `extractable: true`.

Then paste both JSON lines into Vercel → redeploy.

## Step 6 — on-chain stamps (Phase 2 — live)

Run `010_sui_passport_objects.sql`. Set `SUI_SPONSOR_SECRET_KEY` + `SUI_ISSUANCE_CAP_OBJECT_ID`. Veriff webhook provisions on-chain automatically; `/passport` auto-verifies credentials — no JWT paste.

## Step 7 — prover URL (skip until users send txs)

`NEXT_PUBLIC_ZKLOGIN_PROVER_URL=https://prover-dev.mystenlabs.com/v1`
