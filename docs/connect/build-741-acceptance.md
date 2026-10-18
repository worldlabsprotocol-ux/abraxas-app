# Build #741 — Final Solana authentication acceptance

## 1. Authentication protocol (verified)

| Control | Implementation |
|---------|----------------|
| Message format | SIWS-compatible lines in `buildAccountSolanaSignInMessage` (domain, URI, chain, nonce, issued/expiry, request id) |
| Signing | Wallet `signMessage` on UTF-8 message bytes (not a transaction) |
| Verification | Ed25519 detached via `verifyPassportSolanaPersonalMessage` |
| Domain / origin | Challenge stores origin; verify uses `originsMatch` + CSRF `assertPassportWalletSameOriginRequest` on POST |
| Network | `resolveAuthorizedSolanaNetworkFromEnv` must match client `solana_network` |
| Nonce | Random 16-byte hex; unique DB constraint on `nonce` |
| Expiry | 5 minutes; atomic RPC rejects expired rows |
| Replay | `abraxas_consume_account_solana_challenge_atomic` single-use `consumed_at` |
| Rate limit | `enforceNativeAuthRateLimit` on challenge (30/min) and verify (20/min) |
| Session | HttpOnly JWT (`jti` = `acs_*`) + PostgreSQL `abraxas_account_sessions` validate/revoke (migration **147**) |
| Sign-out scope | **Current session only** — `DELETE /api/auth/native/session` revokes server row + clears cookie; JWT replay rejected |
| Context binding | HttpOnly `abraxas_account_sol_auth_ctx` required for verify |

Automated contract tests (not wallet extension):

- `lib/auth/nativeAccount/solanaAuth/solanaAuth.test.ts`
- `lib/auth/nativeAccount/solanaAuth/solanaAuth.adversarial.test.ts`
- `lib/auth/nativeAccount/solanaAuth/solanaAuth.api.test.ts`

## 2. Required migration sequence

### Production (`bztwutzprwsdrtqdpymf`) — **not modified by agents**

Current state (read-only SQL): **no** `abraxas_accounts` table — only legacy `abraxas_credentials`.

| Order | Migration | Required for Solana public sign-in | Required for sandbox enroll + memberships |
|-------|-----------|-----------------------------------|----------------------------------------|
| 1 | **144** `_native_account_webauthn` | **Yes** — `abraxas_accounts` base table | **Yes** — accounts, memberships, sandbox enrollments |
| 2 | **145** `_webauthn_hardening` | **No** for Solana verify alone | **Yes** if using direct PG — adds `memberships.status`, sandbox unique index, WebAuthn atomic RPC |
| 3 | **146** `_native_account_solana_auth` | **Yes** — wallet links + Solana challenges + atomic consume RPC | **Yes** — wallet credentials |

**Why 145 is not optional for full journey:** `postgresDirectStore.upsertPartnerMembership` inserts `status`; sandbox enrollment uniqueness relies on 145 index. Solana sign-in operational probe intentionally skips 145, but **sandbox + Launchpad on direct PG needs 144 + 145 + 146**.

Passkey-only features still require 145 WebAuthn RPC; public Solana sign-in does not.

### Staging demo (`ocntwbxarpjeixdnzide`)

- **144, 145**: already applied (2026-10-17)
- **146**: applied in this acceptance pass (`146_native_account_solana_auth`)

Verify:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'abraxas_account_solana%';
```

## 3. Persistent database account continuity

**Staging:** schema ready after 146 apply; full wallet e2e requires preview deployment bound to `ocntwbxarpjeixdnzide` with native auth flags — not run in cloud VM.

**Automated persistent-style API test (in-memory store mirrors PG contracts):** `solanaAuth.api.test.ts` — first sign-in → session → sign-out → second sign-in → **same `account_id`**.

## 4. Real wallet manual procedure (required for Production GO)

Run on **authorized preview/staging** with persistent DB and correct `NEXT_PUBLIC_APP_URL` origin.

1. Install Phantom or Solflare on devnet.
2. Open site → **Sign in** (no Connect Wallet button).
3. Select wallet → approve connection if prompted.
4. Read modal → **Sign to continue** → approve **message** signature (not transaction).
5. Confirm nav shows **Account** → open `/account/applications` (signed-in, wallet + network shown).
6. **Sign out** → nav returns to **Sign in** → repeat sign-in → same account id in session JSON (`/api/auth/native/session`).
7. Negative: reject signature → remain signed out, no account created.
8. Negative: replay verify POST → 409 `replay`.

Record wallet vendor, network, origin, and account id in operator log.

## 5. Browser layout checks

Playwright captures at 1440 / 1024 / 768 / 390 / 320 and zoom 125% / 150% — see `/opt/cursor/artifacts/build-741-layout-*.png` (generated in CI agent run).

## 6. Business journey (routing only)

| Step | Route | Status |
|------|-------|--------|
| Account hub | `/account/applications` | Functional UI |
| Start building | `/developers/launchpad` + `/api/sandbox/enroll` | Requires account session |
| Pricing | `/pricing` | Existing plans (no fabricated prices) |
| Business integration | Launchpad / integration workspace links | Wired; activation still partner-scoped |

**Payments:** SOL / USDC / USDT mainnet checkout **not** in this PR.

## 7. Production blockers

1. Apply **144 → 145 → 146** on `bztwutzprwsdrtqdpymf` with founder approval  
2. Enable `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1`, session secret, `NEXT_PUBLIC_SOLANA_NETWORK`  
3. Disable `ABRAXAS_NATIVE_ACCOUNT_MEMORY` in Production  
4. Real-wallet manual procedure on staging/preview  
5. Separate payment release review  

## 8. Merge recommendation

**NO-GO for Production** until Production migrations and real-wallet staging sign-off.

**GO for merging PR #741 to `main`** as the Solana authentication release candidate when:

- CI green on latest commit  
- Automated solana auth test suite green  
- Staging DB has 146 (done on demo project)  
- Team accepts manual wallet checklist on Vercel preview before Production flag flip  
