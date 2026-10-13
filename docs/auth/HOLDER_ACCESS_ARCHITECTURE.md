# Holder access architecture (audit)

Observation: `main` after PR #667. Partner operator auth unchanged.

## Surfaces

| Surface | Mechanism | Purpose |
|---------|-----------|---------|
| Holder wallet connect | Wallet Standard (`standard:connect`, Sui chains) | Prove control of a Sui address on the client |
| Abraxas Passport session | Google zkLogin + `sui_zklogin_identities` + HttpOnly `abraxas_browser_session` | Identity assurance, IDV, credentials, privacy APIs |
| Hosted holder bootstrap | `/api/auth/hosted-holder/bootstrap` | Eligible partner flows only; mints hosted identity without Google |
| Partner Launchpad / API keys | Operator sessions, separate cookies | Institutional integration; not holder wallet |
| Admin | `useAdminAccess` gated on holder session + allowlist | Operator console |

## Intended boundaries

- **Wallet connect** is the primary blockchain access path for holders with compatible Sui wallets. It does not mint a Passport server session by itself.
- **Google zkLogin** remains for existing Passport accounts, sponsored zkLogin wallets, and browser session continuity. Legacy recovery stays explicit and separate.
- **Passport** continues to own identity verification and reusable private proofs. Wallet possession is not substituted for institutional approval or verified eligibility.
- **No automatic identity merge** between a connected wallet and a Google session unless the user completes an existing Abraxas binding or sign-in flow that proves ownership.

## Migration status

- **Wallet-only server sessions** (signature challenge login without zkLogin) are **not enabled** on this branch to avoid unauthorized database or security boundary changes.
- Holders with zkLogin Passports should use **Continue with Google** under Passport account until wallet-login backend is explicitly authorized.

## Key files

- `components/sui/SuiWalletStandardConnect.tsx`
- `components/sui/HolderAccessPanel.tsx`
- `components/sui/SuiAuthProvider.tsx`
- `app/api/auth/browser-session/route.ts`
- `lib/auth/hostedHolderEligibility.ts`
