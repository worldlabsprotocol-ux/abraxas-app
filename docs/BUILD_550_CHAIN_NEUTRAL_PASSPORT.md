# Build #550 — Chain-neutral Passport authentication

## Canonical holder model

- **Subject:** `abx_hs_<32 hex>` — Abraxas-issued, not derived from wallet or OAuth.
- **Wallet binding:** CAIP-10 account rows in `passport_holder_wallet_accounts` after cryptographic verify.
- **Legacy:** `passport_holder_legacy_links` maps `sui_zklogin_address` / OAuth keys to subjects without merging evidence.

## Authentication surfaces

| Chain | Challenge | Verify |
| --- | --- | --- |
| EVM | `POST /api/auth/passport-evm/challenge` | `POST /api/auth/passport-evm/verify` (EIP-4361 / personal_sign) |
| Solana | `POST /api/auth/passport-solana/challenge` | `POST /api/auth/passport-solana/verify` |
| Sui (optional) | `POST /api/auth/passport-wallet/challenge` | `POST /api/auth/passport-wallet/verify` |

Sessions: HttpOnly JWT with `hs` (holder subject), optional legacy `sui`, `am`, `wcaip`.

## Migration

`136_passport_holder_subjects.sql` — **proposed only**; not applied to Production.

## Partner Flow

`/api/v1/partner-flow/evaluate` resolves `resolveSessionHolderSubjectId(session)` for rate limits and evaluation. Legacy Sui subject strings remain supported via `normalizePartnerFlowSubject`.
