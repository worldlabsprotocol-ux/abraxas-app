# Build #739 — Wallet vs native Abraxas account assessment

## Decision

**No new wallet authentication architecture.** Native Abraxas accounts remain **WebAuthn passkeys** (`abx_ac_*`, server sessions, atomic challenge consumption). Wallet flows stay **optional** and **Passport-scoped**, not a substitute for public Connect.

## Existing integration (retained)

| Surface | Mechanism | Account boundary |
|---------|-----------|------------------|
| Native Connect | `lib/auth/nativeAccount/*` WebAuthn + `abraxas_*` persistence | Abraxas account session (`abx_ac_*`) |
| Sui holder / Passport | Wallet Standard + `@wallet-standard/base`, zkLogin chooser | Holder browser session; not native account |
| Passport wallet auth | `passportWalletAuth` challenge RPC, sign + verify routes | Explicit wallet challenge; no silent account merge |
| EVM / Solana Passport | `passportEvmAuth`, `passportSolanaAuth` stores | Passport-only; server-verified signatures |

## Requirements mapping

- **WebAuthn without Google or mandatory wallet:** satisfied by native passkey path when DB operational.
- **Wallet optional:** Sui/zkLogin and Passport wallet routes remain behind Passport and holder menus, not public Connect.
- **No wallet address = authenticated Abraxas account:** native session requires passkey verify; wallet linking uses explicit APIs (`passport-wallet/link-legacy`, holder subject binding) with challenge consumption.
- **No redundant stack:** do not add a second passkey or wallet-native account layer alongside `nativeAccount`.

## Production blocker (unchanged)

Passkey persistence requires migrations **144** and **145** on `bztwutzprwsdrtqdpymf`. Wallet adapters do not remove this dependency.
