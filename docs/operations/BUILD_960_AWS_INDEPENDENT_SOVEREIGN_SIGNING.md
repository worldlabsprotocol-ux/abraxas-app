# BUILD #960 — AWS-independent sovereign signing architecture

**Founder directive:** AWS must not be a mandatory dependency of Abraxas.  
**Status:** BUILD #959 AWS EC2/KMS provisioning path is **deferred** (optional later). This build documents the audit and enables an **AWS-free non-production demonstration**.

## Phase 1 — Audit summary

| Component | AWS required today? | Already independent? |
|-----------|---------------------|----------------------|
| Portable receipts + `@abraxas/independent-verifier` | No | Yes |
| Evidence / policy / Postgres sovereign store | No | Yes |
| Governance pin + dual-signature registry | No | Yes (disposable_pg tests) |
| `CustodyClient` contract (`contract.ts`) | No | Yes — provider-agnostic |
| `institutionalSigner` document binding | No | Yes |
| Isolated signing worker HTTP surface | No | Yes (loopback, scoped callers) |
| AWS KMS adapter (`awsKmsClient.ts`) | Only when provider = `aws-kms` | Optional adapter |
| Worker bootstrap (before #960) | **Effectively yes** unless `DEMO_MEMORY=1` | Partial |
| Live hardware non-exportable custody | Needs **some** custody backend | AWS KMS is **one** option |

**Software vs live acceptance:** Unit and disposable-Postgres proofs do not require AWS. Live `institutionalSigner.aws.integration.test.ts` and BUILD #959-style ops **do** require authorized AWS (or future hardware adapter).

## Phase 2 — Provider-independent custody (this build)

### Contract (unchanged)

`CustodyClient`: `getPublicKey()` + `signRawDigest(32-byte digest)` per role-bound identity.

### Providers

| Provider | Env | Production | Hardware non-exportable |
|----------|-----|------------|-------------------------|
| `demo-memory` | `ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY=1` | Forbidden | No |
| `self-hosted-file` | `ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER=self-hosted-file` + `ABRAXAS_SELF_HOSTED_*_SEED_PATH` | Forbidden | **No** (software seeds on host) |
| `aws-kms` | Isolated IAM per role + KMS key IDs | Supported | Yes (KMS HSM backing) |
| PKCS#11 / Vault Transit | Not bound in this build | Future adapters | Vault/HSM-dependent |

Constants: `lib/institutional/signing/custodyImplementation.ts` (`OPTIONAL_AWS_KMS_CUSTODY`, `SELF_HOSTED_SOFTWARE_CUSTODY`, `EVALUATED_VAULT_TRANSIT_CUSTODY`).

### NP demonstration (no AWS account)

```bash
# Generate two 32-byte seeds (example); store on worker host only, mode 0600.
export ABRAXAS_INSTITUTIONAL_SIGNING_WORKER=1
export ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT=demo
export ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER=self-hosted-file
export ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH=/secure/issuer.seed
export ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH=/secure/status.seed
export ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID=np-anchor
export ABRAXAS_STATUS_SIGNER_KEY_ID=np-status
# + per-scope caller secrets (see scripts/institutional-signing-worker.ts)
node scripts/institutional-signing-worker.ts
```

Seed file format: single line, base64url encoding of **32 bytes** (Ed25519 seed).

## Phase 3 — Security preserved

- No exportable private JWK in worker env (`workerStartup.ts`).
- No `signRawDigest` RPC; document-bound signing only.
- Software custody **cannot** be claimed as hardware non-exportable (`hardwareNonExportable: false`).
- Production blocks `demo-memory` and `self-hosted-file`.
- Valid signature alone does not authorize registry writes (unchanged `recordedWorkflow`).

## Phase 4 — Evidence executed (this build)

| Test | Result |
|------|--------|
| `resolveInstitutionalCustodyProvider.test.ts` | Provider selection |
| `providerIndependentWorkflow.test.ts` | Sign + verify without AWS; worker bootstrap from seed files |
| Existing `institutionalSigningWorker.test.ts` | Unchanged demo-memory worker boundary |

Run:

```bash
npm exec vitest run --no-file-parallelism \
  lib/institutional/signing/resolveInstitutionalCustodyProvider.test.ts \
  lib/institutional/signing/providerIndependentWorkflow.test.ts \
  lib/institutional/signing/worker/institutionalSigningWorker.test.ts \
  lib/institutional/signing/sovereignInstitutionalAcceptance.test.ts
```

## Phase 5 — Report

### Reused (no rewrite)

- Worker, verifier package, sovereign migrations, governance pin, recorded workflow, AWS adapter.

### AWS dependencies

- **Eliminated as mandatory:** protocol + NP worker path via `self-hosted-file` / `demo-memory`.
- **Remain optional:** `aws-kms` adapter and BUILD #959 ops docs.

### Code changes (this build)

- `softwareEd25519Custody.ts`, `selfHostedSeedFile.ts`, `resolveInstitutionalCustodyProvider.ts`
- `workerBootstrap.ts`, `workerStartup.ts`, `institutionalSigner.ts`, `custodyImplementation.ts`

### Guarantees demonstrated (software NP)

1. Authorized document signing + independent verification  
2. Fail-closed misconfiguration (production + software custody)  
3. Separate issuer/status identities  
4. Worker isolation from receipt runtime  

### Still requires hardware (honest)

- Production institutional **non-exportable** custody claims → KMS and/or PKCS#11 HSM adapter  
- BUILD #959 live KMS acceptance matrix rows marked `hardware` / `operational`

### Minimal operating cost (AWS-free NP)

- Any Linux host + sovereign Postgres (existing) + loopback worker — **no AWS line items**.

### Blockers

- Live hardware-backed demo without procuring HSM or AWS  
- Production promotion still gated on custody class choice  

**Finish line for #960:** Abraxas can demonstrate sovereign signing and independent verification **without an AWS account**, while honestly separating software NP custody from hardware institutional custody.