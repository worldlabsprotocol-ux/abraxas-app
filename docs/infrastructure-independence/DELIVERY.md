# Infrastructure independence and Production native auth — delivery (Build follow-up)

This document satisfies the Production native authentication and Supabase independence audit. **No Production credentials, flags, or data were changed in this build.**

## 1. Production native authentication readiness

### Vercel configuration (non-secret, authorized MCP)

Production project `abraxas-app` has **encrypted** env entries present for:

- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` (production target)
- `ABRAXAS_WEBAUTHN_RP_ID` (production target)
- Session secret configured at runtime (`session_secret_configured: true` on live probe)

### Live Production runtime (`GET https://abraxasworld.xyz/api/auth/native/enabled`)

Observed at audit time:

| Signal | Value |
| --- | --- |
| `enabled` | **false** |
| `native_auth_flag_state` | **unset** (runtime process env) |
| `session_secret_configured` | true |
| `webauthn_rp_id_configured` (env var) | false |
| `webauthn.rp_id` (resolved) | `abraxasworld.xyz` (host fallback) |
| `deployment_environment` | production |
| Production deploy | **BUILDING** on commit `d03459cf` (PR #736 merge) — env changes require **READY** deploy to affect runtime |

**Operator action:** Confirm a **READY** Production deployment after env updates. Until runtime reports `native_auth_flag_state: enabled`, Connect remains Passport/native-disabled behavior per PR #736.

**Do not enable the flag** until migrations 144/145 are verified on Production Postgres and staging passkey smoke completes.

## 2. Actual Connect behavior (PR #736, merged)

| Environment | Connect |
| --- | --- |
| Native enabled + signed out | One-click WebAuthn **authenticate**; explicit **Create passkey account** only on confirmed `no_passkey` |
| Native session active | **Account** → `/account/applications` |
| Valid holder browser session | Profile menu (server session, not localStorage alone) |
| Native disabled | **Connect** → `/passport` (no Google auto-redirect; not Integration Studio as account connect) |

## 3. Database migration verification

| Migration | Purpose |
| --- | --- |
| `144_native_account_webauthn.sql` | Native accounts, passkeys, challenges, memberships, enrollments |
| `145_abraxas_webauthn_hardening.sql` | Atomic `abraxas_consume_webauthn_challenge_atomic`, membership status, enrollment uniqueness |

Runtime probe (non-destructive): `probeNativeAuthSchemaReady()` via `/api/auth/native/enabled` → `schema` field when persistence is configured.

## 4. Supabase dependency inventory

Machine-readable: `lib/infrastructure/trustBoundaryInventory.ts` (`TRUST_BOUNDARY_DEPENDENCIES`).

Summary by classification:

| Class | Examples |
| --- | --- |
| **Replaceable storage** | Partner telemetry, webhook outbox, audit rows |
| **Auth / authorization state** | Native WebAuthn store, holder sessions, memberships, policy rows, receipt registry for *current* validity |
| **Cryptographic verification** | Ed25519 receipt signing, `verifyReceiptIndependently`, published verification keys |
| **External trust root** | Google zkLogin, Veriff (optional), chain RPC stamps |
| **Legacy / transport** | Supabase-branded PostgREST client (`requirePersistenceAdmin`) — **not** the trust root for signatures |

Operations that **cannot** run when PostgreSQL/PostgREST is unavailable (fail closed): native passkey ceremonies, sandbox enroll, holder session mint, current-validity authorization, membership checks.

## 5. Independence gaps

1. **Default persistence transport** is still Supabase PostgREST (`supabase_postgrest`) unless `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`.
2. **Native account store** uses PostgREST table APIs — portable SQL already in migrations; transport swap only.
3. **Current validity** requires live DB for revocation/supersession — by design; offline verify must not approve protected actions without fresh evidence.
4. **Production runtime lag** — Vercel env updated but deploy not yet serving new env at audit instant.

## 6. Existing provider-neutral abstractions

| Abstraction | Location |
| --- | --- |
| `requirePersistenceAdmin` / `AbraxasPersistenceClient` | `lib/persistence/admin.ts`, `types.ts` |
| Env aliases (`ABRAXAS_POSTGREST_URL`, `ABRAXAS_DB_SERVICE_ROLE_KEY`) | `lib/persistence/env.ts` |
| Passport hybrid direct pg | `ABRAXAS_PASSPORT_TRANSACTION_PG`, `passportHybridPostgres.ts` |
| Native account facade | `lib/auth/nativeAccount/store.ts` |
| Independent receipt verifier | `lib/institutionalCertification/build546/independentVerifier.ts` |
| Sovereign dependency audit | `lib/sovereignRuntime/sovereignDependencyAudit.ts` |
| Port documentation | `lib/infrastructure/persistencePorts.ts` |

## 7. Recommended persistence architecture

**Recommendation:** Continue **PostgreSQL as the system of record** with a **phased transport migration**:

1. **Now:** Keep Supabase-hosted Postgres + PostgREST for operational simplicity; use Abraxas-named env vars where possible.
2. **Next:** Enable `ABRAXAS_PASSPORT_TRANSACTION_PG` + direct URL for high-assurance Passport paths (already supported).
3. **Later:** Cut over native account + partner stores to `postgres_direct` (`pgPool.ts`) with the same SQL migrations — **no change** to `abx_ac_*` identifiers or receipt signing rules.
4. **Institutional option:** Self-managed PostgreSQL (RDS, Cloud SQL, or dedicated VM) with PostgREST or direct `pg` — improves portability, increases operational ownership.

Supabase remains acceptable as **commodity Postgres hosting** as long as Abraxas owns keys, schemas, and verification contracts.

## 8. Safe incremental migration strategy

1. Document and verify backups (Build #552 manifest pattern).
2. Apply migrations 144/145 on Production in maintenance window.
3. Rehearse on staging with Production RP ID.
4. Enable native flag on staging → Playwright native-auth suite.
5. Production canary deploy with flag **off**, then enable flag after schema probe green.
6. Optional: set `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct` on staging first; run full regression.
7. **Separate PR** for any Production data migration or cutover — not this build.

## 9. Staging outage and verification tests

Automated (Vitest):

- `lib/infrastructure/infrastructureIndependence.test.ts` — inventory + readiness blockers
- `lib/infrastructure/providerOutageBehavior.test.ts` — 503 on store unavailable; independent verifier blocks authorization without live revocation
- Existing: `lib/persistence/portability.contract.test.ts`, `nativeAuth.security.test.ts`

Manual / staging (operator):

- DB pause → native auth routes return 503, no session mint
- Signed receipt file → `verifyReceiptIndependently` → `cryptographically_authentic` true, `currently_authorizable` false when revocation unavailable

## 10. Offline vs fresh verification

Canonical list: `lib/infrastructure/offlineVerificationContract.ts`.

- **Offline:** signature authenticity, payload integrity, signed expiry window.
- **Requires fresh state:** revocation, supersession, partner suspension, replay consumption, evidence freshness.

## Security and compatibility

- Memory native store **forbidden** in Production (`configValidation.ts`).
- No automatic account creation after auth failure (PR #736).
- Passport / zkLogin paths unchanged; no silent identity linking.
- Production settings **not** modified by this PR.

## Merge recommendation

Merge after CI green. **Production native enable remains an operator step** after READY deploy + migration verification + staging smoke.
