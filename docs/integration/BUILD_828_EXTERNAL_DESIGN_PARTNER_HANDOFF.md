# Build #828 — External design partner integration readiness

**Baseline:** #827 merged @ `2205f731` · **No Production / infra changes**

## 1. Canonical partner integration entry point

**`docs/integration/design-partner/README.md`**

Single route:

- **Issuance:** [VERIFY_WITH_ABRAXAS_QUICKSTART.md](../VERIFY_WITH_ABRAXAS_QUICKSTART.md) + `examples/verify-with-abraxas-external/`
- **Independent enforce:** `examples/portable-relying-party/` + Partner Kit `enforcePortableVerificationWithTrustContinuity`
- **Continuity:** [BUILD_827_PARTNER_TRUST_CONTINUITY.md](./BUILD_827_PARTNER_TRUST_CONTINUITY.md)

No new framework — consolidates #821–#827 surfaces.

## 2. Integration package links

| Item | Location |
|------|----------|
| Hub | `docs/integration/design-partner/README.md` |
| Quickstart | `docs/integration/design-partner/QUICKSTART.md` |
| Env vars | `docs/integration/design-partner/ENVIRONMENT.md` |
| Trust anchor | `docs/integration/design-partner/TRUST_ANCHOR.md` |
| Test cases | `docs/integration/design-partner/SANDBOX_TEST_CASES.md` |
| Errors | `docs/integration/design-partner/ERRORS_AND_RECOVERY.md` |
| Security split | `docs/integration/design-partner/SECURITY_RESPONSIBILITIES.md` |
| Pilot checklist | `docs/integration/design-partner/PILOT_ACCEPTANCE_CHECKLIST.md` |
| Copy-ready verify | `examples/portable-relying-party/verifyPortableReceipt.ts`, `verifyWithContinuity.ts` |
| Example README | `examples/design-partner-sandbox/README.md` |

## 3. Clean-environment execution (Abraxas-measured)

Executed on Build #828 branch:

```bash
npm run validate:typescript
npm run test:build-828-design-partner-readiness
```

| Result | Detail |
|--------|--------|
| TypeScript | `validate:typescript` pass |
| Independence proof | Verifier-only tests pass; no `@/lib` on portable verify path |
| Checkpoint + adversarial | Included in #827 suite |

**Not claimed:** External partner completed pilot or live sandbox timing.

## 4. Remaining setup friction

| Friction | Mitigation |
|----------|------------|
| PartnerKit not published to npm | Integrators vendor from repo or copy patterns; document explicitly |
| Sandbox API key + allowlist | Founder / Integration Studio manual |
| Portable export 503 on env | Abraxas ops enables issuer export vars on target deployment |
| Holder wallet step | Required for real signed receipt — cannot skip in pilot |
| Checkpoint store | Partner implements `PartnerStatusCheckpointStore` on their storage |

## 5. Partner-side security responsibilities

See `docs/integration/design-partner/SECURITY_RESPONSIBILITIES.md` — keys, pins, checkpoints, enforcement, idempotency.

## 6. Pilot acceptance checklist

See `docs/integration/design-partner/PILOT_ACCEPTANCE_CHECKLIST.md`.

## 7. PR / CI

Documentation + test script only; CI via standard `typescript-validation` and existing vitest jobs.

## 8. Founder action — invite first external design partner

1. Select **one** narrow sandbox policy (wallet-control or age-21 recommended).
2. In Integration Studio, create partner sandbox application **or** delegate self-serve with founder oversight.
3. **Allowlist** partner HTTPS callback URL(s).
4. Deliver **once**: `abx_test_…` API key, `partner_id`, `policy_id`, `application_id` (secure channel).
5. Deliver **out-of-band**: Demo/sandbox trust anchor JSON + fingerprint ([TRUST_ANCHOR.md](./design-partner/TRUST_ANCHOR.md)).
6. Confirm **portable export** enabled on the target base URL (`/api/receipts/{id}/portable-verification`).
7. Send partner link: `docs/integration/design-partner/README.md` (rendered in repo or exported PDF).
8. Schedule Day 12–14 joint review; do **not** implement partner product code for them.

## Acceptance metrics (targets vs measured)

| Metric | Target (pilot) | Measured (repo) |
|--------|------------------|-----------------|
| Time to first sandbox request | Partner Day 3–5 | N/A until external partner |
| Integration steps (hosted + portable) | ≤ 12 documented | 12 in QUICKSTART |
| Time to first independent verify | Partner Day 6–8 | Synthetic: sub-second in vitest |
| Runtime deps for verify | Node + verifier only | Confirmed |
| Permit/deny/indeterminate | Explicit | 14+ automated tests |
| Stale status rejection | Required | adversarial + integration-first |
| Checkpoint after restart | Required | file store test (#827) |

## Permanent standard

Integrate Abraxas; do not host Abraxas. Holder authorizes; partner enforces.
