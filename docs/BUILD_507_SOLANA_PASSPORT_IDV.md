# Build #507 — Solana-native Passport, IDV, and Good Trouble

## PR dependency chain

1. **#617** — merged to `main`
2. **#618** — `cursor/web3-native-wallet-auth-505-5ffe` (open)
3. **#619** — `cursor/solana-native-protocol-506-5ffe` (base: #618)
4. **#507 PR** — `cursor/solana-native-passport-idv-gt-507-5ffe` (base: #619 branch)

Do not merge #618 automatically. Merge order: #618 → #619 → #507.

## Feature flags

- `ABRAXAS_SOLANA_NATIVE=true`
- `NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE=true`
- Wallet-first flags from #618 remain required for Phantom sign-in.

## Demo Supabase migrations (order)

Apply on demo project `ocntwbxarpjeixdnzide` only:

1. `134_holder_wallet_login.sql`
2. `135_canonical_holder_accounts.sql`
3. `136_cielo_verified_guest_solana_policy.sql`
4. `137_good_trouble_age_21_solana_idv.sql`

Never apply to production from this build.

## Holder context (Phase 1)

Server resolver: `lib/holder/holderRequestContext.ts`

- Resolves verified session → canonical `holder_account_id` → `claims_subject_key` → Solana wallet binding freshness.
- Never trusts client-supplied `holder_id` / `sui_address` without session match.

Browser session bridge: `lib/auth/browserSession.ts` accepts JWT v3 Phantom sessions when Solana-native flag is on (claims subject key becomes API subject).

## IDV path (Phases 2–4)

Session-authorized routes:

- `POST /api/idv/create-session`
- `POST /api/idv/register-session`
- `GET|POST /api/idv/sync-decision`
- `GET /api/identity/status`
- `GET /api/credentials/me`
- `GET /api/credentials/verify-self`

Veriff `vendorData` uses `abx:{claims_subject_key}` (legacy `sui:` still parsed).

Passport presentation states: `lib/passport/passportPresentationState.ts` (`NOT_STARTED` … `REVOKED`).

## Good Trouble Solana policy (Phase 5)

Immutable successor policy id: **`good-trouble-age_21_retail-solana-v1`**

- Does **not** modify `good-trouble-age_21_retail-v1` (L0 self-attest pilot).
- Requires L2 `identity_verified` + active credential path (see `lib/goodTrouble/solanaAge21RetailPolicy.ts`).
- Purchase policy selection when Solana-native flag is on: `lib/goodTrouble/resolveGoodTroublePurchasePolicy.ts`.

## Operator demo steps

1. Enable flags on demo deployment.
2. Apply migrations through `137`.
3. Phantom sign-in → confirm `/api/auth/holder-session` returns `holder_account_id` + `claims_subject_key`.
4. Open `/passport` — no Google requirement when Solana-native.
5. Start IDV — expect `503` with honest message if `VERIFF_API_KEY` is unset (not a fake approval).
6. After authorized review + credential issuance in demo, initiate Good Trouble purchase flow with policy `good-trouble-age_21_retail-solana-v1`.
7. Verify receipt via existing partner verify endpoints (no Sui zkLogin).

## Rollback

- Disable `ABRAXAS_SOLANA_NATIVE` / client flag → legacy Sui/zkLogin paths resume.
- Policy row `good-trouble-age_21_retail-solana-v1` can remain (inactive via flag routing).
- Column `identity_verifications.holder_account_id` is additive and safe to leave in place.

## Blockers (honest)

- Live Veriff + human review E2E requires operator credentials and reviewer action (not fabricated in CI).
- Live Phantom browser proof requires deployment protection bypass and demo env vars.
