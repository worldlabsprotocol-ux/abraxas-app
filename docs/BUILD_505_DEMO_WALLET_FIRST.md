# Build #505 — Demo wallet-first rollout

## Demo Supabase

Project ref: `ocntwbxarpjeixdnzide` (never production `bztwutzprwsdrtqdpymf`).

## Apply migration

Run migration `134_holder_wallet_login.sql` on the Demo database before enabling the flag.

## Vercel / Demo environment

```text
ABRAXAS_WALLET_FIRST_AUTH=true
NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH=true
ABRAXAS_BROWSER_SESSION_SECRET=<existing secret>
NEXT_PUBLIC_SUPABASE_URL=<demo url>
SUPABASE_SERVICE_ROLE_KEY=<demo service role>
```

Optional cluster override:

```text
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet
```

## Manual verification (Phantom)

1. Open `/passport` or `/cielo/verified-rate` on Demo with flag enabled.
2. Click **Continue with Phantom** — approve **message** sign (not a transaction).
3. Confirm `GET /api/auth/holder-session` returns `login_method: solana_wallet`.
4. Cielo: expect honest banner that Passport/Sui steps are still required for v1 policy.
5. Legacy: **Sign in with Google** still available below wallet CTA.

## Rollback

Set both wallet-first env vars to `false` or unset. Existing zkLogin sessions (JWT v1) continue to work. No data deletion required.

## Blockers

- Phantom browser automation in CI is not enabled; live proof is manual on Demo.
- Solana login does not satisfy Cielo v1 or Good Trouble age policies without linked Passport subject and evidence.
