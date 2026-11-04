# Build #761 — Judge-ready evidence package (index)

Use this index for hackathon submissions, investor diligence, and design-partner technical review. **Every claim below must match what you can reproduce on the cited commit and environment.**

Status labels (use consistently):

| Label | Meaning |
| --- | --- |
| **Implemented** | Code and routes exist in repo |
| **Cryptographically tested** | Vitest / certification scripts pass in CI |
| **Issuer operational** | Real issuer credentials and governance in production |
| **Production authorized** | Founder / operator sign-off for production policy outcomes |

---

## 1. Problem (institutional)

**Claim:** Relying parties need policy outcomes without inheriting identity data custody.

**Read:**

- `docs/BUILD_563_PROOF_FIRST_PROTOCOL.md`
- `docs/ABRAXAS_PRODUCT_INTEGRITY_AND_INSTITUTIONAL_COMMUNICATION_STANDARD.md`

**Do not claim:** Universal production age eligibility; sandbox demonstrations establish protocol behavior only.

---

## 2. Architectural differentiation

**Claim:** Trust is layered—wallet control, issuer evidence, Abraxas policy execution, independent receipt verification—without a permanent “identity account” for ephemeral wallet flows.

**Read:**

- `docs/connect/WALLET_NATIVE_TRUST_PROTOCOL.md` — wallet connected vs authenticated vs action authorized
- `docs/blockchain-native-institutional-verification.md` — issuer registry, presentation, production NO-GO boundaries
- `docs/build-760-holder-presentation.md` — sandbox presentation simulation vs Phantom wallet control

**Inspect (code):**

- `lib/auth/ephemeralWallet/protocolEnvelope.ts`
- `lib/protocolVerification/executeVerification.ts`
- `lib/passport/reusableCredential/` — presentation orchestration

---

## 3. Functional proof — Priority 1 (one transaction)

### 3A. Developer Workspace (wallet holder, sandbox test issuer)

**Story:** Choose policy → prepare presentation → authorize presentation (session possession key) → Phantom test verification signature → signed receipt → independent validate.

**Environment:** Non-production Preview; `ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER=1`; ephemeral Redis where required.

**Tests (CI-equivalent):**

```bash
ABRAXAS_EPHEMERAL_INTEGRATION_TEST=1 npx vitest run lib/auth/ephemeralWallet/ephemeralWallet.integration.test.ts
```

**Status:** Implemented + cryptographically tested (sandbox only). Not issuer operational / not production authorized for real age.

### 3B. Partner hosted verification (relying party)

**Story:** Server creates verification request → holder completes hosted flow → partner verifies callback server-side.

**Read:** `docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`

**Status:** Implemented; cryptographic testing via partner/unit suites; production depends on partner credentials and policy binding.

### 3C. Third-party independent verification (no Abraxas session)

**Story:** Holder presentation bundle + institution config → CLI verifies without Abraxas DB.

```bash
npm run build-569:verify-bundle -- ./bundle.json \
  --institution-config ./institution.json \
  --consumption-dir ./var/consumption \
  --checkpoint-dir ./var/checkpoints
```

**Read:** `docs/partner-handoff/passport-independent-verifier/README.md`

**Status:** Implemented + cryptographically tested in repo certification flows; operational status depends on partner-provisioned trust env.

### 3D. Institutional certification (automated reports)

```bash
npm run certify:build-546
npm run test:build-547-live-partner
npm run certify:build-547
```

Reports under `reports/` when run locally (not all generated in CI artifacts by default—run commands for demo recordings).

---

## 4. Solana integration — Priority 2

**What Solana wallet contributes today (inspectable):**

- Purpose-bound `signMessage` authorization for sign-in and scoped actions (Developer Workspace test verify, sandbox enter, etc.).

**What on-chain programs contribute (when partner-deployed):**

- Reference gate: `solana/abraxas-eligibility-gate/` — partner-operated config, trusted signers, `authorize` with instruction introspection; **Abraxas does not operate this on mainnet as product infra.**

**Read:**

- Program header comment in `solana/abraxas-eligibility-gate/programs/abraxas-eligibility-gate/src/lib.rs`
- `docs/demo-solana-attestation-signer.md` (operator/devnet tooling where applicable)

**Honest statement for judges:** Solana wallet signatures prove **wallet control for a declared purpose**. Issuer credentials and Abraxas policy receipts prove **eligibility evidence**. On-chain gates add value when a **partner program must enforce** eligibility atomically in composable DeFi/RWA—not when duplicating off-chain receipt verification.

---

## 5. Partner integration — Priority 3

**Primary doc:** `docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`

**Failure handling to demonstrate:**

- Missing sandbox API key → fail closed
- Callback without durable `request_id` store → unsafe (documented)
- Receipt replay / consumption semantics → Build #547/#548 certification topics

**Staging handoffs (design partner):**

- `docs/partner-handoff/institutional-sandbox-activation-583.md`
- `docs/partner-handoff/design-partner-acceptance.md`

---

## 6. Demonstration progress — Priority 4 (do not invent)

Record **only verified items**, for example:

- [ ] Preview URL used for recorded demo (branch + commit SHA)
- [ ] CI run URL (GitHub Actions) for shown tests
- [ ] Design-partner sandbox activation doc date / scope
- [ ] Completed institutional certification command output (attach JSON hash)

If no live partner production traffic exists, state that explicitly—credibility beats inflated traction.

---

## 7. Suggested 2–3 minute judge video structure

1. **Problem** (15s) — reusable verification, minimal disclosure.
2. **One live HTTP journey** (60s) — Workspace or hosted partner; show receipt fields, not PII.
3. **Independent verify** (30s) — POST validate or `build-569:verify-bundle` exit 0.
4. **Solana role** (30s) — Phantom scoped signature + optional partner gate **only if** shown in same demo.
5. **Ship proof** (15s) — CI test command + repo link.

Avoid: claiming mainnet production issuer readiness without registry evidence.

---

## 8. Build #761 delivery checklist

- [ ] Rank 1 lane recorded with commit SHA and Preview URL
- [ ] This index linked from hackathon submission / deck
- [ ] Solana narrative doc aligned with wallet vs program boundaries
- [ ] Partner quickstart exercised once on Preview (screenshot or log redacted)
- [ ] Demand section filled with **real** items only

**Next engineering milestone after #761:** genuine external issuer credential presentation with recognized issuer authority—not another simulated credential system.
