# Build #730 — Pre-merge security and functional acceptance

## Confirmed issues fixed in this pass

| Issue | Fix |
| --- | --- |
| In-memory native store split across Next.js route modules in dev | `globalThis` singleton in `memoryStore.ts` |
| Passkey public key encoding | `isoBase64URL` for COSE storage and verification |
| Challenge replay / TOCTOU | Atomic consume via migration `145` RPC + consume-before-verify in `passkeyService` |
| Production memory auth risk | `nativeAccountMemoryStoreEnabled` returns false when `NODE_ENV=production` |
| Missing config gate | `validateNativeAuthRuntimeConfig` (session secret length, memory forbidden in prod) |
| Sandbox default policy invalid | Default template `age_21_retail` |
| Duplicate sandbox apps per account | `getPrimarySandboxEnrollment` short-circuit |
| Account vs sandbox conflated in UI | Two-step `WelcomeStartSandboxFlow` |
| Weak rate limits on passkey routes | `enforceNativeAuthRateLimit` on register/auth endpoints |
| Revoked membership still authorized | Membership `status` column (145) + server check in `assertPartnerMembership` |
| Unsafe rollback wording | Flag-off rollback documented below (no drop-after-real-users) |

## WebAuthn test results (real virtual authenticator)

Playwright (`playwright.native-auth.config.ts`, Chrome CDP virtual authenticator):

- **Register passkey → account session** — pass
- **Sign out → sign in → same `abx_ac_*`** — pass
- **Sandbox enroll idempotency** — pass (second enroll returns same `partner_id` with `idempotency_replay`)

Command:

`NATIVE_AUTH_SKIP_WEBSERVER=1 NATIVE_AUTH_DEV_PORT=3025 npx playwright test -c playwright.native-auth.config.ts`

Vitest: 15+ unit/security tests (`nativeAuth.security`, `configValidation`, `progressiveTrust`, challenge lifecycle).

## PostgreSQL integration

Migration **144** + **145** must be applied on staging/production. Memory store is **not** used in production (`NODE_ENV=production`).

No live Postgres URL was available in the Cloud Agent VM for this run; staging apply + RPC smoke remains a **deployment blocker** before merge.

## Safe rollback (non-destructive)

1. Set `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=false` (or unset).
2. Stop routing users to `/welcome` as primary entry if desired.
3. **Retain** all `abraxas_*` tables and rows (accounts, passkeys, memberships, grants, enrollments).
4. Legacy Google/zkLogin/wallet/API-key flows continue unchanged.
5. Re-enable after staging validation by flipping the flag and confirming migrations 144–145.

**Destructive** `DROP TABLE` rollback is only for disposable environments with no real native accounts.

## Account continuity

- No changes to Passport credentials, zkLogin wallets, or API key hashes.
- No email/wallet/name-based tenant linking.
- `abraxas_account_holder_bindings` remains **future capability** (explicit proof not implemented in UI).

## Merge recommendation

**Remain draft** until:

1. Migrations **144** and **145** applied on staging Postgres.
2. Same Playwright suite run against staging URL with flag enabled.
3. One successful sandbox provision against real Launchpad RPC (not memory).

Functional acceptance for native passkey **ceremony** is satisfied in this environment; **persistence/RPC** acceptance requires staging.
