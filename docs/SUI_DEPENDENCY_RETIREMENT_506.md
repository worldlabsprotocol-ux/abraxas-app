# Build #506 — Sui / zkLogin dependency retirement inventory

**Generated from repository scan:** ~272 TypeScript/SQL files reference `zklogin`, `@mysten/sui`, `SuiAuthProvider`, or `sui_zklogin_identities`.

**Strategy:** Solana-native **new holder path** first; Sui remains **HISTORICAL READ ONLY / MIGRATE DATA** until cutover PRs land.

## Classification legend

| Class | Meaning |
|-------|---------|
| **REPLACE NOW** | Blocks Solana-native journeys; successor shipped or in #506 slice |
| **MIGRATE DATA** | Runtime still reads Sui tables; needs holder_id mapping |
| **HISTORICAL READ ONLY** | Legacy receipt/provenance verification; keep read paths |
| **REMOVE AFTER CUTOVER** | Delete only when no production dependency |
| **RETAIN FOR LEGAL/AUDIT** | Immutable audit exports, migration hashes |

## REPLACE NOW (506 slice touched)

| Area | Path / symbol | Successor |
|------|----------------|-----------|
| Holder browser session (new users) | `requireBrowserSession` only | `requireHolderClaimsSession` + JWT v3 (`hid`, `csk`) |
| Cielo eligibility (new users) | `cielo-verified-guest-v1` + Sui binding | `cielo-verified-guest-solana-v1` + Solana binding |
| Wallet login account | `holder_wallet_accounts` only | + `holder_accounts` + `claimsSubjectKeyForAbraxasSubject` |
| Primary sign-in UX | Google / `SuiAuthProvider` primary | Phantom + `WalletFirstSignIn` when `ABRAXAS_SOLANA_NATIVE` |

## MIGRATE DATA (next PRs)

| Area | Evidence |
|------|----------|
| Passport IDV | `app/api/idv/*`, `identity_verifications.sui_address` |
| Credentials / claims | `lib/credentials/claimsService.ts` (subject = Sui-shaped key) |
| Partner Flow | `app/api/v1/partner-flow/*` → `requireBrowserSession` |
| Good Trouble age_21 | `lib/goodTrouble/*`, Sui subject lookups |
| Wallet authority repair | `app/api/wallet-authority/repair` |
| User profiles | `user_profiles.wallet_address` (now also claims key for Solana holders) |

## HISTORICAL READ ONLY

| Area | Evidence |
|------|----------|
| Legacy zkLogin register | `app/api/auth/zklogin/register/route.ts` |
| Sui on-chain passport issuer | `lib/sui/passportIssuer.ts`, `app/api/sui/*` |
| Historical receipt stamps | Existing `decision_receipts` with Sui-era subject ids |
| Demo migration manifest | `scripts/demo/lib/demoMigrationManifest.ts` |

## REMOVE AFTER CUTOVER

| Area | Notes |
|------|-------|
| `lib/sui/zklogin/*` client bundle | After migration window + operator sign-off |
| `components/sui/SuiAuthProvider.tsx` | Replace with Solana holder provider |
| Google OAuth primary CTAs | Hidden when `ABRAXAS_SOLANA_NATIVE=true` (#506) |
| `lib/hooks/useWalletAuth.ts` | Client-only fake session |

## RETAIN FOR LEGAL/AUDIT

- Supabase migrations `007_sui_zklogin.sql` onward (immutable history)
- Audit event streams referencing Sui addresses
- `#503` / `#616` receipt trust tests for **immutable** `cielo-verified-guest-v1`

## Sample file list (first 80 paths)

See repository `rg` output; dominant clusters:

- `lib/sui/zklogin/**` — **REMOVE AFTER CUTOVER**
- `components/sui/**` — **MIGRATE DATA**
- `app/api/auth/zklogin/**` — **HISTORICAL READ ONLY** (legacy login)
- `lib/cielo/verifiedGuestPolicy.ts` — **HISTORICAL READ ONLY** (immutable v1)
- `lib/cielo/verifiedGuestSolanaPolicy.ts` — **REPLACE NOW** (506)

## PR merge order (safe)

1. Merge **#617** (504 UX/auth continue) if not already on `main` ✓
2. Review **#618** (505 wallet login) — do **not** merge until 506 reviewed OR merge 618 then rebase 506
3. Merge **#619** (506 Solana-native slice) — **stacked on #618 branch**
4. Apply Demo migrations **134 → 136** in order
5. Enable `ABRAXAS_SOLANA_NATIVE=true` on Demo only
6. Follow-on PRs: IDV on holder_id, Good Trouble Solana policy, receipt Solana commitments, partner flow
