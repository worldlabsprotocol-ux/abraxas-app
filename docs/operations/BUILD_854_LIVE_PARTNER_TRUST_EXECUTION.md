# Build #854 — Live Wallet-Native Partner Trust Execution

## HTTP routes

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/v1/partner-flow/trust-execution/challenge` | Partner API key (`verify:requests`) + `x-abraxas-application-id` | Issue scoped challenge (server-derived policy/app) |
| GET | `/api/v1/partner-flow/trust-execution/challenge/[challengeId]` | Holder wallet session | Fetch message + status |
| POST | `/api/v1/partner-flow/trust-execution/authorize` | Holder wallet session | Verify signature + atomic consume |
| POST | `/api/v1/partner-flow/trust-execution/execute` | Partner API key | Issue signed receipt + portable verify bundle |

Purpose: `abraxas_wallet_trust_execution_v1`. Action: `partner_flow:evaluate`.

## Durable state

- Table: `wallet_scoped_trust_challenges` (sovereign slice + migration proposal `008` / `154_proposal`)
- RPC: `abraxas_consume_wallet_scoped_trust_challenge_atomic` — one-time consume under concurrency

Store path: `querySovereignStagingPg` only. Unavailable pool → **503 fail closed**.

## Evidence modes

- **Live (deployable):** default — requires pre-authorized issuer keys, partner policy, sovereign evidence, SIAS, and signed status. Fail closed (`denied` / `indeterminate`) when unavailable. Execution does **not** insert issuer keys or policies.
- **Controlled test (CI/disposable only):** requires **all** of:
  - `ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE=1`
  - `ABRAXAS_SOVEREIGN_ENV_CLASS=disposable`
  - `ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES=true`
  - `ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION=disposable_ci_only`
  - `VERCEL_ENV` not `production` or `preview`

Synthetic fixture signing is isolated in `executeTrustExecutionFixture.internal.ts` and cannot be enabled on Demo/Production via a single env toggle.

## Independent verification

Execute response returns `independent_verification_material` (portable receipt + signed issuer authority + signed status). Relying parties verify locally with a **pinned** trust anchor. Abraxas does **not** return `currently_acceptable` as proof.

## Durability

- `wallet_scoped_trust_execution_outcomes` — at most one finalized receipt per `authorization_ref` (transactional finalize).
- Challenge rows store authoritative `subject_pseudonym_id` at issue time (no caller-supplied seed on execute).

## CI

```bash
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/partner/trustExecution/partnerTrustExecutionHttp.integration.test.ts
```

## Activation gates

- Sovereign PostgreSQL URL configured (`ABRAXAS_SOVEREIGN_STAGING_PG_URL` / disposable class)
- Migration `008` applied on target operational PG (not Demo/Production in #854)
- Launchpad application rows present for partner scope resolution
- Production evidence pipeline wired (remove test-evidence flag)
