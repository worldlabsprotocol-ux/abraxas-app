# Build #730 — Authentication architecture audit

This document inventories Abraxas authentication, authorization, and verification boundaries as of merge base `origin/main` (including PR #729), and records the native-account additions in this branch.

## Planes of session

| Plane | Cookie / credential | Establishes | Does **not** establish |
| --- | --- | --- | --- |
| Public (L0) | None | Anonymous read of docs, `/try`, marketing | Tenant access, verification |
| Native account (L1) | `abraxas_account_session` (JWT, passkey) | Control of `abx_ac_*` subject | Passport holder identity, partner tenancy |
| Holder browser (L1–L3) | `abraxas_browser_session` | Holder subject / legacy Sui session | Operator tenancy without separate proof |
| Partner console (L2) | `abraxas_partner_console_session` | Operator access to a `partner_id` | Holder credentials, cross-tenant access |
| Partner API (L2 server) | `abx_*` API keys | Server integration auth | Human operator identity |

Authentication establishes **access**. Authorization (membership, scopes, policy) is always evaluated server-side per operation.

## Legacy dependencies (preserved)

- **Google OAuth / zkLogin**: Sui holder provisioning (`sui_zklogin_identities`), browser sessions with `authMethod: oauth`, legacy recovery paths unchanged.
- **Wallet auth**: EVM / Solana / Sui wallet challenges (migrations 134–136), chain-neutral `abx_hs_*` subjects.
- **Launchpad API keys**: `authenticatePartner` / `abx_test_*` remain the integration credential; console may still be opened via key paste.

## Routes that previously forced identity before product entry

| Surface | Prior gate | Target behavior |
| --- | --- | --- |
| `/account/applications` | Holder Google/wallet via `useSuiAuth` | Native account or API key operator session; holder optional |
| `/developers/launchpad` | Partner console via API key | Account membership session **or** API key |
| `/passport` | zkLogin/wallet for status fetch | Session required only for protected identity APIs (PR #729) |

## New native account model (this branch)

- **Subject**: `abx_ac_<32 hex>` (`abraxas_accounts`), distinct from `abx_hs_*` holder subjects.
- **WebAuthn**: Migration `144_native_account_webauthn.sql` — passkeys, challenges, memberships, auditable grants, holder binding table (explicit only).
- **Feature flag**: `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` — **off by default in production**; enabled in Vitest.
- **Entry**: `/welcome` — Explore / Start sandbox / Open Passport.
- **Sandbox enroll**: `POST /api/sandbox/enroll` — requires L1 account session; creates tenant + membership + optional operator cookie.
- **Legacy claim**: `POST /api/account/applications/claim` — requires API key proof; no email/wallet/name matching.

## Progressive trust map

See `lib/trust/progressiveTrust.ts`. Levels 0–4 describe **access requirements**, not a global identity score. Policy evaluation and receipt verification paths are unchanged.

## Verification vs authentication

| Operation | Auth | Authorization | Verification |
| --- | --- | --- | --- |
| Read public docs | — | — | — |
| Provision sandbox app | Account passkey | Membership on `partner_id` | — |
| Launchpad configure policy | Console session | Tenant + role | — |
| Submit IDV evidence | Holder browser session | Policy + consent | Issuer / IDV pipeline |
| Production activation | Console + institutional gates | Operator approval | Compliance evidence |

## Compatibility and rollback

- Migrations 144–145 are additive. **Safe rollback:** disable `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED`, stop new enrollment, **preserve** all native account rows and audit grants. Legacy OAuth/wallet/API keys unchanged.
- **Destructive** table drops only in disposable environments with no real native accounts.
- No silent linking: `abraxas_account_holder_bindings` requires explicit proof workflow (table present; UI binding flows remain future work).
- Production credentials and wallet custody are not modified by this PR.

## Security tests (automated)

- `lib/auth/nativeAccount/nativeAuth.security.test.ts` — challenge replay, membership enforcement for account operator JWTs.
- `lib/trust/progressiveTrust.test.ts` — level boundaries.
- Existing Launchpad session tests remain for API-key console sessions.

Browser WebAuthn ceremonies require a platform authenticator; staging validation must exercise `/welcome` with the flag enabled before default rollout.

## Deployment prerequisites

1. Apply `144_native_account_webauthn.sql` to staging/production Postgres.
2. Set `ABRAXAS_ACCOUNT_SESSION_SECRET` (or reuse browser session secret).
3. Configure `ABRAXAS_WEBAUTHN_RP_ID` for production hostname.
4. Enable `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true` only after staging passkey smoke tests.
