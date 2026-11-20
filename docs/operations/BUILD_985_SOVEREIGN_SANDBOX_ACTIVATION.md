# BUILD #985 — Sovereign sandbox activation and independent acceptance

**Base:** `origin/main` including merged PR **#983** (`1a4a5fc5`) and **#984** (`7b4a8ff7`)  
**Scope:** Operational preflight, pinned identity checklist, local trust journey, distributed replay audit, independent verifier authority — **no protocol expansion**, **no connected spend/deploy without founder approval**.

## Acceptance label legend

| Label | Meaning |
|-------|---------|
| **LOCAL PROGRAMTEST ACCEPTED** | BanksClient / ProgramTest journey green with repository program IDs |
| **NOT CONFIGURED** | Required operator env absent (`npm run build-985:preflight`) |
| **BLOCKED** | Policy/cluster/attestation/KV or infrastructure mismatch |
| **READY FOR CONNECTED EXECUTION** | Prerequisites pass (`mint_and_consume_actionable` + distributed KV probe); **not** verification success |
| **CONNECTED SANDBOX VERIFIED** | Wallet-signed mint/consume on pinned RPC + independent `partner-verify` evidence — **never** emitted by read-only preflight |
| **NOT PERFORMED** | Step not executed (browser UX, connected wallet journey, etc.) |

Preflight JSON uses `acceptance.connected_operational_status` for readiness and `acceptance.connected_chain_verification.status` (always `NOT_PERFORMED` from preflight). RPC URLs are never serialized — only redacted endpoint metadata.

---

## 1. Operational readiness audit (repository)

| Component | Status |
|-----------|--------|
| Proof continuity program (`FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1`) | Implemented; local `.so` present under `target/deploy/` |
| Entitlement consumer (`CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T`) | Implemented; local `.so` present |
| Token-2022 mint/consume instructions | Implemented (#979–#983) |
| Independent partner verifier (#981) | `examples/independent-solana-entitlement-partner/` + `partner-verify` binary |
| Integration Studio journey (#982) | Vitest journey + workbench contract |
| Connected prepare/confirm (#983) | API route + boundary + bytecode attestation |
| Remittance class assignment (#984) | **Isolated** crate `token2022-remittance-assignment` — does not alter entitlement programs |
| Operator RPC / genesis / SHA-256 env | **Not configured** in this agent environment |
| Ephemeral distributed KV | **Not configured** in this agent environment (`backend: none`) |

Authoritative connected configuration is env-driven — see [BUILD_983_CONNECTED_SANDBOX_EXECUTION.md](./BUILD_983_CONNECTED_SANDBOX_EXECUTION.md).

---

## 2. Pinned sandbox identity (repository constants)

| Field | Expected value |
|-------|----------------|
| Proof continuity program ID | `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` |
| Entitlement consumer program ID | `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T` |
| Token-2022 program | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Cluster genesis hash | Operator-set `ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH` |
| ELF SHA-256 attestations | Operator-set per-program env vars (must match deployed upgradeable loader data) |

Unexpected bytecode or genesis → `evaluateConnectedSandboxBoundary()` **fails closed** (`wrong_cluster`, `*_attestation_mismatch`).

**Local build artifact digests** (for operator attestation pinning; rebuilds will change these):

| Artifact | SHA-256 |
|----------|---------|
| `abraxas_proof_continuity.so` | `831db00b43e35368207db661e7d16d5a39b03e14e18151ba06f33c6df76594c8` |
| `abraxas_proof_entitlement_consumer.so` | `de31e9ae450ef86bd62661d222e50dcf892e514d18e4dfc0bfc1417722bb2f81` |

---

## 3. Deployed vs missing (this environment)

| Resource | State |
|----------|--------|
| Programs on pinned RPC | **Unknown / not probed** — no RPC URL configured |
| Registry PDA | **NOT PERFORMED** |
| Entitlement mint config PDA | **NOT PERFORMED** |
| Trusted relying-party config | **NOT PERFORMED** |
| Funded operator admins | **NOT PERFORMED** |
| Prepare HMAC | **Missing** |

### Operator deployment plan (do not execute without approval)

1. Build programs: `anchor build` / existing `target/deploy/*.so`.
2. Deploy both upgradeable programs to the **same** non-production cluster; record program IDs (must match repository constants unless founder approves new IDs).
3. Initialize proof registry, entitlement mint config, trusted relying-party config for the Launchpad partner/policy/application binding.
4. Set server env: RPC URL, registry admin, relying-party admin, prepare HMAC, cluster label, genesis hash, both ELF SHA-256 values.
5. Configure ephemeral KV for multi-instance prepare/confirm.
6. Re-run `npm run build-985:preflight` until operational status is **READY FOR CONNECTED EXECUTION**, then execute wallet-signed mint/consume and export independent verifier evidence (separate from preflight).

Estimated network cost: **not computed** — depends on cluster choice and account rent; operator must quote from cluster tooling.

---

## 4. Local trust journey

**Label: LOCAL PROGRAMTEST ACCEPTED**

| Suite | Result |
|-------|--------|
| `partner_acceptance` (integration-tests) | **8 passed** |
| `tokenization_entitlement` | **20 passed** |
| `test:build-981` (includes `partner-verify` authorized/revoked) | **PASS** |
| Adversarial cases (wrong wallet, revoked, replay, etc.) | Covered in ProgramTest modules above |

---

## 5. Distributed replay protection

Executable coverage in vitest (included in `npm run test:build-985`):

- JTI/action signature reuse rejection and idempotent retry (`connectedSandboxPrepareStore.test.ts`)
- Superseded prepare message hash / confirm cache scoping (`connectedSandboxConfirmCache.test.ts`)
- Prepare-to-confirmation binding and wrong-message rejection (`connectedSandboxPrepareBinding.test.ts`)

**Engineering note:** `writeConnectedSandboxPrepareRecord` writes the prepare payload then resets the JTI binding in **two** KV operations. Multi-key atomicity remains **unresolved** until concurrency-tested or corrected. Confirmation re-reads the prepare record and matches on-chain message hash, so a stale confirm cache cannot override a newer prepare when message hashes differ. Multi-instance connected traffic requires distributed KV with a successful `probeEphemeralKv` — env presence alone is insufficient.

---

## 6. Independent partner acceptance

| Path | Label |
|------|-------|
| Offline `partner-verify` on committed artifacts | **LOCAL PROGRAMTEST ACCEPTED** (structural/semantic; artifacts restored to committed pins after local runs) |
| Authenticated chain evidence on pinned RPC | **NOT PERFORMED** (no RPC operator config in agent) |

Authoritative acceptance for connected execution remains **`partner-verify` against live RPC-fetched state**, not Studio UI success copy.

---

## 7. Developer experience (Integration Studio)

**Label: NOT PERFORMED** — no hosted preview wallet session in this cloud agent run.

Automated regression: `test:build-982` (**34 passed**) + security journey tests in `test:build-983`.

Manual operator checklist before connected activation:

- Desktop + mobile: Choose → Verify → Receive → Use → Independently Verify
- Declined signatures, missing env, resumed sessions, and error copy must not show false success

---

## 8. Operational approval boundary

This build **did not**:

- Deploy to production or mainnet
- Fund wallets or upgrade live programs
- Expose administrative private keys
- Merge automatically

**Stop line:** Operator must approve deployment, funding, and env publication; then run connected mint/consume and export verifier evidence.

---

## 9. Test commands and results (2026-11-20 agent)

```bash
npm run test:build-985    # 32 vitest passed (includes #983 subset)
npm run test:build-981    # partner_acceptance + tokenization_entitlement + partner-verify PASS
npm run test:build-982    # 34 passed
npm run test:remittance-assignment  # 10 passed, 1 ignored (CPI Guard optional)
npm run build-985:preflight         # JSON → /opt/cursor/artifacts/build-985-preflight.json
```

---

## 10. Engineering deliverables checklist

| # | Deliverable | Value |
|---|-------------|-------|
| 1 | Commit SHA | *(set at PR merge candidate — see PR branch)* |
| 2 | PR link | *(created on push)* |
| 3 | Files changed | `docs/operations/BUILD_985_…`, `scripts/operations/build-985-sovereign-sandbox-preflight.ts`, `build985AcceptanceLabels.test.ts`, `package.json` scripts |
| 4 | Sandbox operational readiness | Software **ready**; operator env/infra **missing** |
| 5 | Deployed vs missing | See §3 |
| 6 | Program IDs / local ELF hashes | See §2 |
| 7 | Distributed replay | Vitest **pass**; see §5 |
| 8 | Local issuance/consumption | **LOCAL PROGRAMTEST ACCEPTED** |
| 9 | Independent verification (connected) | **NOT PERFORMED** |
| 10 | Browser acceptance | **NOT PERFORMED** |
| 11 | Security failures demonstrated | ProgramTest adversarial cases **pass** |
| 12 | Remaining operator approvals | Deploy, fund, env, KV, founder sign-off for connected proof |
| 13 | Activation cost | **Not estimated** (no cluster selected) |
| 14 | CI | Pending PR checks |
| 15 | Recommendation | **GO** local engineering · **NO-GO** connected until operator activation |

---

## Class assignment (separate from protocol)

Submit repository `https://github.com/worldlabsprotocol-ux/abraxas-app` with path  
`solana/abraxas-eligibility-gate/remittance-assignment/` and passing-test screenshot (`remittance-assignment-tests.png`).

---

## Preflight

```bash
npm run build-985:preflight
```

Read-only report; exit code `2` when operational status is **NOT CONFIGURED** or **BLOCKED**. Never claims **CONNECTED SANDBOX VERIFIED**.