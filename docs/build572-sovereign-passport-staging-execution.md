# Build #572: Sovereign Passport staging execution

## 1. Staging environment used (this run)

| Field | Value |
| --- | --- |
| **Intended deployment** | Founder controlled **persistent sovereign staging** (Build #558), not Production and not the cloud agent disposable VM |
| **Observed execution host** | Cursor cloud agent VM (`127.0.0.1:5432/sovereign_b568_gate` disposable PostgreSQL only) |
| **Deployed staging origin** | **Not available** (`ABRAXAS_STAGING_HTTP_BASE_URL` unset; Vercel staging env not readable from agent scope (403)) |
| **Environment class** | Disposable / development (`ABRAXAS_SOVEREIGN_ENV_CLASS` not `staging` on this host) |

The cloud agent VM is **not** a substitute for founder staging. Regression tests below use **isolated disposable PostgreSQL** only; they do not satisfy Build #572 success criteria.

Reference configuration template: `.env.sovereign.staging.example`, `docs/BUILD_558_PERSISTENT_SOVEREIGN_STAGING.md`.

## 2. Build #571 readiness audit (this host)

```bash
npm run build
npm run build-571:staging-readiness-audit
```

**Result:** `activation_ready: false` (exit code 2).

Representative blockers on this host (see full JSON in CI artifacts or local run):

| Failure code | Configuration requirement |
| --- | --- |
| `browser_auth_unconfigured` | Staging origin: `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` and OAuth redirect, or enabled Passport wallet auth |
| `migration_column_missing` | Apply migrations **140-143** on **dedicated** staging DB with founder authorization |
| `idv_review_pending_founder_evidence` | Legitimate IDV + human review on staging; founder execution evidence after witnessed review |
| `credential_issuer_registry_unconfigured` | `ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY` + signing material on staging host |
| `revocation_publisher_url_missing` | `ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL` + institution bootstrap trust |
| `receipt_registry_unconfigured` | `ABRAXAS_RECEIPT_VERIFICATION_REGISTRY`, `ABRAXAS_SIGNING_KEY_ID`, consumption dir |

On an authorized staging operator workstation, re-run the audit after configuring `ABRAXAS_STAGING_ENVIRONMENT_ID`, approval secret, and probe env vars documented in `docs/build571-sovereign-passport-staging-activation.md`.

## 3. Founder activation checklist

| Item | Exists on main (code/docs) | Missing on staging (typical) | Requires founder approval |
| --- | --- | --- | --- |
| Staging origin + Next deployment | Build #558 compose + `.env.sovereign.staging.example` | Live URL + env on host | Deploy / DNS |
| Google zkLogin or wallet auth | Passport wallet + zkLogin routes | Public client id, callback, staging secrets | Yes |
| Dedicated staging PostgreSQL | Schema manifest through 143 in repo | Isolated `abraxas_sovereign_staging` instance | Yes |
| Migrations 140-143 | SQL in `supabase/migrations/` | Applied on staging DB only | **Yes (no shared/prod apply from agent)** |
| Credential issuer registry + signing | Issuance code (Build #567) | Staging env registry and keys | Yes |
| Receipt signing + verification registry | Decision receipt lifecycle | Staging keys and registry JSON | Yes |
| Authenticated revocation publisher | Publisher fetch in presentation path | Hosted publisher + TLS | Yes |
| Institution bootstrap trust | Build #569 verifier docs | Per-institution bootstrap JSON | Yes |
| Two test institutions + policies | Partner Flow + `partner_policies` seed patterns in tests | Staging rows for Institution A and B | Yes |
| IDV provider + human review | Admin review routes | Operator credentials + provider config | Yes |
| Receipt consumption + checkpoint dirs | Independent verifier CLI | Durable paths per institution | Yes |
| Build #571 execution evidence | Schema + audit | Witnessed browser session + HMAC evidence file | Yes |

## 4. Evidence chain (Build #572 pilot)

Status key: **PASS** (witnessed on staging), **BLOCKED** (founder/env), **REGRESSION** (disposable PG tests only, not staging proof).

| Step | Environment | Status | Artifact |
| --- | --- | --- | --- |
| Authenticated Passport session | Staging origin | **BLOCKED** | No founder staging credentials in agent |
| Authorized IDV completion | Staging + provider | **BLOCKED** | No operator session |
| Human review approval | Staging admin | **BLOCKED** | n/a |
| Issuer credential issuance | Staging | **BLOCKED** | n/a |
| Holder possession registration | Staging browser | **BLOCKED** | n/a |
| Institution A consent | Staging Partner Flow | **BLOCKED** | n/a |
| Institution A signed authorization | Staging | **BLOCKED** | n/a |
| Institution A independent verify | External CLI | **REGRESSION** | `build569` tests / CLI docs |
| Institution B consent | Staging | **BLOCKED** | n/a |
| Institution B signed authorization | Staging | **BLOCKED** | n/a |
| Institution B independent verify | External CLI | **REGRESSION** | `build569` tests |
| Replay + cross-institution reject | External CLI | **REGRESSION** | `build569.independentVerifierTrust` |

Do not treat **REGRESSION** rows as Build #572 success.

## 5. Independent verifier (when staging bundle exists)

Institution A and B each run separately (no Abraxas identity DB):

```bash
npx tsx scripts/build-569/independent-passport-verifier-cli.ts bundle-a.json \
  --institution-config institution-a.json \
  --consumption-dir /secure/inst-a/consumption \
  --checkpoint-dir /secure/inst-a/checkpoints
```

Repeat for Institution B with **different** consumption and checkpoint directories. Expect replay of the same receipt id to fail on the second run.

See `docs/partner-handoff/passport-independent-verifier/README.md`.

## 6. Regression verification (agent VM)

```bash
npm run test:passport-reusable-credential-572
npm run build
```

Portable revocation security and proof-first tests are included in the 572 script (via 571 bundle).

## 7. Product defects corrected in Build #572

None in this run. Execution blocked before live staging observation. Fix only defects found during founder-led staging pilot.

## 8. Remaining operational blockers

1. Provision and document the **canonical staging HTTPS origin** (`ABRAXAS_STAGING_HTTP_BASE_URL`).
2. Complete Build #571 audit to `activation_ready: true` on that host.
3. Execute sections 3-8 of this document on staging with witnessed evidence (screenshots, redacted receipt ids, verifier exit codes).
4. Record founder execution evidence JSON with approval HMAC after witnessed browser and IDV steps.
