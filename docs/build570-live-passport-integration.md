# Build #570: Live Passport holder and institutional integration

## 1. Application audit (main after PR #698)

| Step | Browser surface | Server path | Automated PG proof |
| --- | --- | --- | --- |
| Wallet auth and holder subject | `PassportCustomerView`, wallet panels | Session and holder subject resolution | Yes |
| Passport sign in and recovery | `PassportSignInRecoveryPanel`, session probe | Auth cookies | Partial |
| IDV capture and submission | `AbraxasIdentityCapture`, verify flow | IDV APIs | Yes |
| Human review and approval | Admin review queue | Manual issuance gate | Yes (manual IDV in tests) |
| Credential issuance | Lifecycle panel, possession register | Backfill and storage | Yes |
| Possession registration | Reusable credentials panel | Possession key API | Yes |
| Credential display and export | Reusable credentials panel | List and export APIs | Yes |
| Institution discovery and consent | Institutional presentation panel | Catalog and consent APIs | Yes |
| Challenge sign and present | Institutional panel | Challenge and present APIs | Yes |
| Partner receipt | Present API response | Authorization atomic finalize | Yes |
| Independent verifier | Partner handoff CLI | `verifyPassportInstitutionalBundleOperational` | Yes |

Gaps addressed in Build #570:

- Device possession persistence option via IndexedDB (opt in), without server custody.
- Partner handoff documentation and template institution config.
- Extended independent verifier security tests (`build570.independentVerifierSecurity.test.ts`).

## Blank page root cause (Build #570 correction)

Observed blank `/passport` on port **3000** correlated with a **stale or hung `next dev` process** (many stuck `curl` connections, requests never completing). Production mode on port **3010** (`next start`) renders correctly: sign in unavailable banner when Google zkLogin is not configured, Passport header, tabs, and Connect or open Passport block.

Fixes applied:

- Inner `Suspense` boundary in `PassportPageClient` with `AccountAccessFirstPaint` fallback.
- No authentication bypass added.

Browser evidence after correction: `/opt/cursor/artifacts/build570-passport-prod-3010.png`.

Not verified in this cloud run:
- Full wallet sign in through production identity provider.
- Human review approval in admin UI with real operator login.

## 2. Holder journey

Passport route: `/passport` tab workspace shows reusable credentials when session is ready.

Lifecycle states come from `GET /api/passport/reusable-credentials/status`. Credentials list only when state is `credential_issued`.

Recovery actions: possession key registration and issuance backfill retry without repeating IDV when already approved.

## 3. Possession keys

Private keys remain in the browser (session storage and optional IndexedDB). Server stores public keys only.

Rotation requires explicit user action. No silent replacement when a credential is bound.

## 4. Institutional requests

Catalog from `GET /api/passport/reusable-credentials/institutional-catalog`. Policies resolved server side in consent and present routes.

## 5. Partner handoff

See `docs/partner-handoff/passport-independent-verifier/README.md`.

## 6. Staging activation checklist

### Code

- [ ] Merge Build #570
- [ ] `npm run test:passport-reusable-credential-570`
- [ ] `npm run build`

### Isolated or staging database

- [ ] Migrations 140 through 143 on dedicated instance (founder approval for shared environments)
- [ ] `ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE=1`
- [ ] Issuer registry and credential signing keys
- [ ] Receipt verification registry
- [ ] Portable revocation publisher and bootstrap trusts per institution

### Institutions

- [ ] Seed immutable partner policies
- [ ] Provision institution config JSON for each design partner
- [ ] Durable consumption and checkpoint directories on partner side

### Production blockers

- External IDV provider production keys
- Production signing key ceremony
- Monitoring and incident runbooks signed off

## 7. Milestone

Holders use the Passport product surface for lifecycle, possession, and institutional consent. Partners verify with their own trust material and durable state without Abraxas identity queries.
