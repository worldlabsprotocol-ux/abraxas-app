# Build #506 — Demo deployment (Solana-native)

## Depends on

- PR **#618** wallet login foundation (branch `cursor/web3-native-wallet-auth-505-5ffe`)
- PR **#619** canonical holder + Cielo Solana policy (branch `cursor/solana-native-protocol-506-5ffe`)

## Migrations (Demo `ocntwbxarpjeixdnzide`)

Apply in order:

1. `134_holder_wallet_login.sql`
2. `135_canonical_holder_accounts.sql`
3. `136_cielo_verified_guest_solana_policy.sql`

## Environment

```text
ABRAXAS_WALLET_FIRST_AUTH=true
NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH=true
ABRAXAS_SOLANA_NATIVE=true
NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE=true
ABRAXAS_BROWSER_SESSION_SECRET=<existing>
NEXT_PUBLIC_SUPABASE_URL=<demo>
SUPABASE_SERVICE_ROLE_KEY=<demo>
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
```

## Manual E2E (Cielo Solana path)

1. `/cielo/verified-rate` → **Continue with Phantom** → sign message.
2. Confirm `GET /api/auth/holder-session` includes `holder_account_id` and `passport_subject_ready: true`.
3. Set profile username on `/account` (claims subject key in session).
4. Refresh Cielo status — wallet binding should show active (login-bound Solana row).
5. Consent → signed receipt → submit verified-rate request.

**Not in scope until follow-on PR:** Good Trouble 21+ without real IDV; on-chain receipt commitments.

## Rollback

Set `ABRAXAS_SOLANA_NATIVE=false`. Legacy Sui/Google paths resume for Cielo v1 evaluation.
