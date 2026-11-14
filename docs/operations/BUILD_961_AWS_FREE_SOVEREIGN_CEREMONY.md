# BUILD #961 — AWS-free sovereign operational ceremony

**PR:** #953 · **Depends on:** BUILD #960 (`self-hosted-file` custody, merged via #952), commit `94c37027` (application scope test fix)

## Objective

End-to-end non-production proof that Abraxas can run **Evidence → Proof → Authority → Continuity** without AWS accounts, KMS, or cloud custody APIs.

## Execution environment

| Layer | Build #961 (this build) | Persistent hosted NP |
|--------|-------------------------|----------------------|
| Custody | `self-hosted-file` seeds on worker host (`chmod 600`) | Same pattern on dedicated VM |
| Postgres | Disposable CI / local `127.0.0.1:5432` | Sovereign NP database |
| Worker | Loopback institutional process | Long-lived loopback + mTLS optional |
| Verifier | `@abraxas/independent-verifier` in-process | Any process without DB/signing keys |

## Commands

```bash
# CI-equivalent (Postgres required for integration cases)
npm run sovereign:build-961-aws-free-ceremony
```

## Evidence (automated)

File: `lib/institutional/signing/build961AwsFreeSovereignCeremony.integration.test.ts`

| Case | Proves |
|------|--------|
| Architecture (no PG) | Software custody not labeled hardware; production forbids self-hosted; governance PG URL forbidden on worker; worker bootstrap + restart without AWS env |
| Ceremony (PG) | Governance pin → dual-signed authority → signed receipt → signed status → **independent verification** without private keys in verifier input |
| Negatives (PG) | Replayed governance, wrong partner scope, tampered status signature |

**Architectural validation**

- No `LIVE_AWS_KMS_*` variables on worker env
- `governance_operator_url_forbidden_on_worker`
- `verifyAbraxasReceiptIndependently` JSON has no `"d":` private material
- `SELF_HOSTED_SOFTWARE_CUSTODY.hardwareNonExportable === false`

## GO / NO-GO

| Classification | Status |
|----------------|--------|
| **Disposable local / CI acceptance** | **GO** when `sovereign:build-961-aws-free-ceremony` passes on PR CI |
| **Persistent hosted operational** | **NO-GO** until BUILD #962 operator steps complete — see `BUILD_962_PERSISTENT_AWS_FREE_ACTIVATION.md` |
| **Production institutional hardware custody** | **NO-GO** — software self-hosted remains demo-only |

## Not in scope

- New Vault/PKCS#11 adapters
- BUILD #959 AWS provisioning
- Production promotion