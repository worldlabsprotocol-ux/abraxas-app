# BUILD #986 — Atomic replay enforcement and sovereign sandbox activation readiness

**Base:** `origin/main` including merged PR **#985** (`f982229b`)  
**Priority:** Close distributed prepare/JTI race; prove multi-instance safety; operator activation checklist — **no protocol expansion**, **no deploy/spend**.

## 1. Problem closed

Prior connected-sandbox preparation used **two KV operations** (prepare write, then JTI reset). BUILD #986 replaces that with a **single atomic bundle key** per `(jti, action)`:

| Mechanism | Implementation |
|-----------|----------------|
| Prepare supersede | Redis `EVAL` Lua `LUA_ATOMIC_PREPARE_TRANSITION` — increments `generation`, updates prepare, clears `bound_transaction_signature` |
| Signature bind | `LUA_ATOMIC_BIND_SIGNATURE` — generation-scoped idempotent bind / replay rejection |
| Confirm commit | `LUA_ATOMIC_COMMIT_CONFIRM` — writes confirm cache only if generation, message hash, and bound signature still match |
| Dev / vitest | In-process bundle map mirrors the same semantics (not counted as distributed acceptance) |

**Backends:** Lua-capable ephemeral KV (`tcp` Redis or `upstash`). Other backends → `connected_atomic_store_unsupported` (fail closed).

## 2. Acceptance labels

| Label | Meaning |
|-------|---------|
| **LOCAL PROGRAMTEST ACCEPTED** | In-memory / vitest replay suites pass |
| **DISTRIBUTED CONCURRENCY ACCEPTED** | `connectedSandboxAtomic.redis.integration.test.ts` green with TCP Redis (`ABRAXAS_BUILD986_DISTRIBUTED_ATOMIC_ACCEPTANCE=1`) |
| **DISTRIBUTED CONCURRENCY NOT PERFORMED** | No TCP Redis in environment (CI skip) |
| **CONNECTED SANDBOX VERIFIED** | Still **not** emitted by preflight — requires wallet + independent verifier after operator activation |

## 3. Tests

```bash
npm run test:build-986
npm run test:build-985
npm run test:build-983
npm run test:build-981
npm run test:build-982
```

Distributed suite (when Redis available):

```bash
ABRAXAS_EPHEMERAL_REDIS_URL=redis://127.0.0.1:6379 npm run test:build-986
```

## 4. Preflight updates (BUILD #985)

`npm run build-985:preflight` now reports:

- `distributed_kv_readiness.atomic_prepare_jti_guarantee` — `implementation_verified` when Lua backend configured
- `distributed_kv_readiness.distributed_concurrency_acceptance` — `PASSED` only when `ABRAXAS_BUILD986_DISTRIBUTED_ATOMIC_ACCEPTANCE=1` after Redis integration run
- Connected-chain verification remains **`NOT_PERFORMED`**

## 5. Operator activation checklist (non-production) — **not executed in this build**

| Step | Requirement | Status |
|------|-------------|--------|
| Cluster | Pinned non-production Solana RPC + `ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH` | Operator |
| Programs | Deploy `abraxas_proof_continuity.so` + `abraxas_proof_entitlement_consumer.so` at repository IDs | Operator |
| Attestations | `ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256`, `ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256` | Operator |
| Registry | Initialize proof registry PDA for `ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN` | Operator |
| Mint config | Entitlement mint config + Token-2022 mint | Operator |
| Trusted RP | Trusted relying-party config for partner/policy/application hashes | Operator |
| Admins | Registry + relying-party authority wallets funded for rent + fees | **Unverified cost** |
| Prepare HMAC | `BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY` | Operator |
| Distributed KV | TCP Redis or Upstash with Lua (`ABRAXAS_EPHEMERAL_REDIS_URL` or Upstash REST) | Operator |
| Verifier | `examples/independent-solana-entitlement-partner` against live RPC evidence | After wallet execution |
| Founder approval | Deploy, fund, activate | **Required** |

**Funding estimate:** Unverified — depends on cluster choice, account rent, and deployment fees. Do not invent numbers.

## 6. GO / NO-GO

| Area | Recommendation |
|------|----------------|
| Atomic replay engineering | **GO** — generation-scoped Lua transitions + vitest coverage |
| Distributed Redis proof | **GO** when CI/agent runs TCP Redis integration; otherwise **NOT PERFORMED** |
| Connected cluster execution | **NO-GO** until operator checklist + founder approval + wallet evidence |

## 7. Files (engineering)

- `connectedSandboxAtomicBundle.ts`, `connectedSandboxAtomicLua.ts`
- `connectedSandboxPrepareStore.ts` (bundle-backed)
- `connectedSandboxPrepareBinding.ts` (generation ticket + supersede check)
- `connectedSandboxExecution.server.ts` (generation commit)
- `redisKv.ts` (`ephemeralKvEval`, `ephemeralKvSupportsAtomicScripts`)
- `connectedSandboxAtomic.redis.integration.test.ts`
- `build985PreflightSemantics.ts` (readiness fields)