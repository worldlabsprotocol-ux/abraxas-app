# Build #741 — Solana-first account access

## Shipped in this branch

| Area | Implementation |
|------|----------------|
| Public nav | Single **Sign in** / **Account** — removed public **Connect Wallet** (Sui) from `RedesignNav` |
| Authentication | SIWS-style message + server verify at `/api/auth/native/solana/challenge` and `/verify` |
| Session | HttpOnly `abraxas_account_session` JWT with `am: solana_wallet` |
| Persistence | Migration `146_native_account_solana_auth.sql` — wallet links + atomic challenge consume |
| Account hub | `NativeAccountSolanaPanel` — Start building / Upgrade paths to Launchpad and `/pricing` |
| Operational gate | Solana auth does **not** require WebAuthn migration 145 (passkey remains separate) |

## Reused (not rebuilt)

- `@solana/wallet-adapter-react` + Phantom/Solflare (`WalletContextProvider`)
- Signature verification (`verifyPassportSolanaPersonalMessage`)
- Network allowlist (`resolveAuthorizedSolanaNetworkFromEnv`)
- Native account tables (`abraxas_accounts`, sandbox enroll, memberships)
- Partner Solana USDC billing (`109_partner_solana_usdc_billing.sql`, launchpad billing routes)

## Deprecated from **public** onboarding (this branch)

- Sui `PublicNavWalletButton` on homepage header
- Passkey-first public **Sign in** (`PublicNavConnectButton` ceremony)
- Passport holder panel on `/account/applications` public hub
- Dual Connect + Sign in pattern

Passkey APIs and holder/Passport Solana routes remain for policy-specific and legacy integrations — not linked from public nav.

## Solana payments (separate release)

Live checkout for SOL / USDC / USDT is **not activated** in this branch. Existing institutional USDC intent flow remains behind merchant configuration. Prerequisites:

- Authorized treasury / mint allowlists
- Migration 146 + 144 applied on target database
- Server-side settlement tests on devnet before mainnet

## Production blockers (verified)

- Project `bztwutzprwsdrtqdpymf`: migrations **144**, **145**, and **146** must be applied with founder approval before Production Solana sign-in is operational.
- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1` and session secret ≥ 32 bytes required.
- `NEXT_PUBLIC_SOLANA_NETWORK` must match deployment policy.

## Tests

- `vitest run lib/auth/nativeAccount/solanaAuth/solanaAuth.test.ts`
- `vitest run lib/nav/publicNavConnectBehavior.test.ts`
- Manual: Phantom on devnet — Sign in → pre-signature modal → account workspace
