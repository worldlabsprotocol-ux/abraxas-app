# Production native account (passkey) rollout

Controlled procedure for enabling `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` in Production. **Do not enable the flag without operator approval.** Build #730 validated staging HTTPS WebAuthn; this checklist closes Production gaps.

## Capability summary

Native account auth provides L1 **account control** via passkeys (`abx_ac_*` subjects), sandbox enrollment (`POST /api/sandbox/enroll`), and Launchpad access without Google OAuth. It does **not** replace holder passport identity, partner API keys, or production authorization gates.

## Prerequisites (verify before enable)

| Area | Requirement | Verification |
| --- | --- | --- |
| Database | Migration `144_native_account_webauthn.sql` applied | `\dt abraxas_accounts` / migration history in target DB |
| Database permissions | App role can read/write native account tables | Staging smoke enroll + passkey register |
| Session secrets | `ABRAXAS_ACCOUNT_SESSION_SECRET` ≥ 32 chars (or approved fallback per `configValidation.ts`) | `/api/auth/native/enabled` + session cookie issuance |
| WebAuthn origin | Production HTTPS origin matches deployed hostname | Browser passkey create on staging with production RP ID rehearsal |
| RP ID | `ABRAXAS_WEBAUTHN_RP_ID` set to production registrable domain | WebAuthn ceremony succeeds on staging with prod RP ID |
| Memory store | `ABRAXAS_NATIVE_ACCOUNT_MEMORY` **not** true in Production | `validateNativeAuthRuntimeConfig` |
| Membership authorization | Sandbox enroll creates tenant + membership; operator JWT scoped to partner | Security tests + manual enroll |
| Sandbox provisioning | `POST /api/sandbox/enroll` idempotent and audited | Staging enroll → Launchpad |
| Rate limiting | Native auth routes covered by existing edge/app limits | Review middleware / route handlers |
| Observability | Passkey failures, enroll errors, session issues logged | Runtime logs + alerts |
| Rollback | Flag off disables new passkey entry; data retained | See build-730 audit rollback section |

Reference: `docs/build-730-authentication-architecture-audit.md`, `docs/build-730-staging-acceptance-report.md`.

## Controlled rollout procedure

1. **Operator sign-off** on checklist above (record date, environment, approver).
2. **Apply migration 144** to Production Postgres during a maintenance window if not already applied.
3. **Set secrets and WebAuthn config** in Production env (session secret, RP ID). Do not enable the flag yet.
4. **Staging rehearsal** with Production RP ID and origin (already completed in Build #730 acceptance; repeat if hostname changed).
5. **Enable flag in staging only**: `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true`; run Playwright `webauthn-lifecycle` / `staging-e2e-730` against staging URL.
6. **Canary in Production**: enable flag for a single deployment; smoke test `/welcome` and homepage `#start-sandbox` (create account → enroll → Launchpad) with an operator passkey.
7. **Monitor** 24–48h: enroll rate, WebAuthn error codes, sandbox provisioning failures.
8. **Full enable** or **rollback** (set flag false; no table drops).

## Outstanding blockers (typical Production default)

Until an operator completes the steps above, Production remains **native-disabled by design**:

- Feature flag default off (`ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` unset/false).
- Homepage workspace entry routes to **Integration Studio** and **public demo** — not passkey enrollment copy or Google redirect.

## Customer-facing surfaces while disabled

- `/api/auth/native/enabled` returns `{ enabled: false }`.
- `NativeAccountPasskeyPanel` shows a generic unavailability message (no env var names).
- No silent redirect to Google OAuth from homepage Connect / workspace CTAs.

## Approval required

| Action | Who |
| --- | --- |
| Production migration 144 | DBA / platform operator |
| Production session + WebAuthn env | Security / platform operator |
| `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true` in Production | Product + platform operator |
