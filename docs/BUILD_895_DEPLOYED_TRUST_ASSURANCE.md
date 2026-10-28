# Build 895 — Deployed trust assurance and independent enforcement

**Base main:** `a7fed3c3` (Build 894 merged)

## Scope (intentionally small)

- No homepage journey changes
- No new protocol engines
- Reuse Build 890 execution contracts, Build 889 mandate enforcement, portable relying-party example

## 1. Production build reliability (894 acceptance)

| Deployment | SHA | Target | State | Notes |
| --- | --- | --- | --- | --- |
| `dpl_BLt8k2dFEXNwvz27suRwRdJw5JW3` | `a7fed3c3` | production | **READY** | Build 894 merge |
| `dpl_FrVevasVbrgz7sYnag79ND2nPRo7` | `77fbea19` | production | ERROR (OOM) | Pre-894 |

**Incident status:** **Open** until **two consecutive** successful Production builds with **recorded peak memory** from Vercel build system reports. One green production observed after 894; collect memory metrics on the next production deploy.

## 2. Independent relying-party enforcement (simulated CI)

| Evidence | Command |
| --- | --- |
| Portable RP permit + audience reject | `vitest run examples/portable-relying-party/portable-relying-party.test.ts` |
| Mandate issuer authority + transaction digest | `vitest run lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts` |
| Expiry / revocation / payload hash | `vitest run lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts` |
| Execution contract guard | `npm run check:execution-contracts` |

External developer path: `examples/portable-relying-party/README.md` + `verifyPortableReceiptFromFile.ts`.

## 3. Institutional issuer handoff (minimum contract)

Document-only module: `lib/institutional/mandate/issuerMandateHandoffRequirements.ts`

Lists required signed artifacts (issuer authority, trust anchor pin, mandate payload, mandate-capable key class, sealed execution context). **No** new issuer dashboard or custody integration.

## 4. Canonical processing emblem (founder correction)

**Asset:** `/brand/living-sphere/abraxas-living-sphere-hero.jpg` (nav crop ≤40px display)

**Components:** `AbraxasProcessingEmblem`, `SolanaAccountSignInDialog`, `HomeInlineWorkspaceProcessing`, proof-check row in `EphemeralSandboxVerificationCompletion`, ephemeral sandbox processing rows in `EphemeralSandboxWorkspaceClient`

**Regression:** `lib/brand/canonicalProcessingEmblem.test.ts`

## 5. Orchestration

```bash
npx tsx scripts/build-895/deployed-trust-evidence.ts
```

Set `BUILD895_PRODUCTION_BUILDS_JSON` when updating production memory evidence.

## Manual checkpoints

- Founder Phantom wallet on Production (full authorized journey)
- Vercel build system peak memory capture (two consecutive production builds)
