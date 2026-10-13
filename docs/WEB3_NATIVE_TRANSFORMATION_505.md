# Build #505 — Web3-native transformation (forensic audit)

**Baseline:** `main` after merge of PR **#617** (Build #504).  
**Evidence:** repository inspection, migration files, auth routes, wallet authority, Cielo/Good Trouble policy modules, CI workflow.  
**Status:** Phase 0 complete; **Phase 16 vertical slice** implemented on branch `cursor/web3-native-wallet-auth-505-5ffe`.

---

## A. Route inventory (holder-critical)

| Surface | Entry | Session gate today |
|--------|--------|-------------------|
| Public home | `/` | None |
| Passport | `/passport` | Client `SuiAuthProvider` + APIs `requireBrowserSession` (Sui) |
| Cielo verified rate | `/cielo/verified-rate` | `requireBrowserSession` → Sui subject |
| Partner hosted flow | `/partner/*`, `/api/v1/partner-flow/*` | Browser session + partner keys |
| zkLogin callback | `/auth/zklogin/callback` | OAuth → zkLogin → cookie |
| Good Trouble browse | `/good-trouble/*` | Policy-specific (age_21_retail) |
| Integration Studio | `/developers/integration-studio` | Partner API keys |
| Launchpad | `/launchpad/*` | Partner credentials |

Full route manifest also tracked in `lib/design/routeInventory.ts`.

---

## B. Authentication dependency graph (current + slice)

```
Holder browser
  ├─ [NEW] Phantom / Wallet Standard signMessage
  │     → POST /api/auth/wallet-login/challenge
  │     → POST /api/auth/wallet-login/verify (ed25519 + DB challenge consume)
  │     → HttpOnly abraxas_browser_session JWT v2 (sol + hwid, optional linked sui)
  ├─ [LEGACY] Google zkLogin
  │     → /api/auth/zklogin/* → register → local zkLogin session
  │     → POST /api/auth/browser-session (id_token) → JWT v1 (sui)
  └─ GET /api/auth/holder-session (sanitized probe)

API authorization (unchanged for Sui-backed flows)
  requireBrowserSession → sui_zklogin_identities row required
```

**Classification:** zkLogin **RETAIN** (legacy migration). Solana wallet login **MODERNIZE** (new canonical path under flag). Client-only `useWalletAuth` localStorage **DEPRECATE**.

---

## C. Internal identity model

| Concept | Store / type | Notes |
|---------|----------------|-------|
| Legacy Passport subject | `sui_zklogin_identities.sui_address` | Still canonical for policies/receipts |
| Wallet binding | `wallet_bindings` (`sui` \| `evm` \| `solana`) | Binding ≠ login; requires subject |
| **New** wallet login account | `holder_wallet_accounts` (migration `134`) | Solana pubkey; optional `linked_sui_address` (no auto-merge) |
| Evidence / IDV | Veriff + credential claims | Independent of wallet connect |

---

## D. Existing wallet capabilities (verified)

- `components/WalletContextProvider.tsx` — Phantom + Solflare via `@solana/wallet-adapter-wallets`
- `lib/partner/walletStandard/connector.ts` — Wallet Standard + Phantom `signMessage`
- `lib/walletAuthority/*` — EVM SIWE binding, Sui binding, challenge replay store
- `lib/hooks/useWalletAuth.ts` — **client-only**, not server-verified (**REPLACE**)

---

## E. Sui-specific dependencies

- Cielo v1 evaluation (`lib/cielo/verifiedGuestPolicy.ts`) — account, profile, **Sui** wallet binding freshness
- zkLogin register, browser session mint with Google `id_token`
- Receipt/decision subjects keyed to Sui-normalized addresses in existing paths

**BLOCKED for wallet-only:** Cielo v1 completion without explicit Sui Passport steps or governed policy successor.

---

## F. Passport / evidence bindings

Passport UI (`PassportPageClient`, `PassportCustomerView`) assumes `useSuiAuth().suiAddress`.  
Wallet-first slice adds `HolderSignInPanel` + honest copy when Solana session lacks linked Sui subject.

---

## G. Policy assurance dependencies

| Policy | ID (representative) | Wallet login sufficient? |
|--------|---------------------|----------------------------|
| Cielo verified guest v1 | `cielo-verified-guest-v1` | **No** — Sui wallet binding + profile |
| Good Trouble retail age | `age_21_retail` | **No** — identity L2 |
| Partner packs | `lib/policy/*` | Per-pack evidence graph |

---

## H. Receipt issuance boundaries

Server: `decision_receipts`, signing keys, verification in partner SDK paths — **unchanged in slice**.  
UI must not imply receipt validity from wallet connection alone (**enforced in copy**).

---

## I. Partner integration boundaries

Partner API keys, tenant isolation, webhooks — **RETAIN**.  
Hosted partner flow still uses `requireBrowserSession` (Sui) until Phase 7 generalization.

---

## J. Admin / operator authorization

Admin routes use secrets / RBAC — **RETAIN**. Wallet login does not grant operator privileges.

---

## K. Design system

`AbxPageShell`, `RedesignShell`, `HolderTrustSurface` (#617), homepage guard on `app/globals.css` + home components — **RETAIN**; homepage changes require `[ui-change]`.

---

## L. Known defects / duplicated UX (verified)

- Duplicate nav when nesting `AbxPageShell` under section layouts (**fixed #617** for Cielo)
- Google zkLogin default redirect dropped Cielo context (**fixed #617** with `continue_path`)
- Passport repeated Google CTAs; wallet connect confused with identity (**addressed in slice**)
- Client `useWalletAuth` simulated verification (**deprecated path**)

---

## M. Tests & E2E gaps

**Present:** vitest for zkLogin, wallet authority EVM, Cielo policy/receipt trust, homepage guard.  
**Missing:** live Phantom E2E in CI; Demo OAuth on protected Vercel previews.  
**Added slice:** `lib/auth/walletLogin/solanaSignIn.test.ts` (crypto + replay nonce).

---

## N. Migration risk

| Change | Risk |
|--------|------|
| `134_holder_wallet_login.sql` | **Low** — additive tables only |
| JWT v2 in same cookie | **Medium** — backward compatible; v1 zkLogin unchanged |
| Linking Solana → Sui | **High** — future PR; explicit operator review |

---

## O. Phased execution plan

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | This document | **Done** |
| 16 | Wallet login + session + Cielo/Passport entry UI + tests | **Shipped (slice)** |
| A | Canonical holder linking / migration | Planned PR |
| B | Wallet-neutral policy successors | Planned PR |
| C–I | Passport evidence, receipts UI, partner UX, E2E, admin | Follow-on |

---

## Phase 16 shipped (this branch)

- Solana SIWS-style challenges + ed25519 verification
- `holder_wallet_accounts` + login challenges (migration 134)
- HttpOnly session JWT v2 + `/api/auth/holder-session`
- Feature flag: `ABRAXAS_WALLET_FIRST_AUTH` / `NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH`
- Cielo + Passport wallet-first UI with legacy Google secondary
- Demo rollout: `docs/BUILD_505_DEMO_WALLET_FIRST.md`
