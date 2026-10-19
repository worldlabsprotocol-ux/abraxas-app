# Institutional trust transaction — end-to-end execution

This document describes how to reproduce a **complete sandbox institutional trust transaction** using real Abraxas HTTP routes. It is written for operators, integrators, and protocol reviewers.

**Trust context:** Developer Workspace with authorized **sandbox test issuer** credentials only. Outcomes use label `ephemeral_sandbox_test_only` and are **not** production eligibility authorization.

---

## Transaction lifecycle

| Step | Action | Abraxas surface |
| --- | --- | --- |
| 1 | Institution defines policy requirement | Sandbox partner `ephemeral_wallet_sandbox`, policy `age_21_retail` |
| 2 | Holder establishes wallet session | Solana wallet sign-in envelope |
| 3 | Holder prepares presentation | `POST /api/auth/wallet/sandbox/presentation/prepare` |
| 4 | Holder authorizes presentation | `POST /api/auth/wallet/sandbox/presentation/authorize` |
| 5 | Holder signs scoped verification request | Solana wallet action `sandbox:verification:test` |
| 6 | Abraxas evaluates evidence and policy | `POST /api/auth/wallet/sandbox/test-verify` |
| 7 | Relying party verifies decision | `POST /api/auth/wallet/sandbox/validate` (no wallet session) |

---

## Reproduce locally (automated)

Prerequisites: Node 24, repository dependencies installed.

```bash
npm run test:build-762-institutional-trust
npm run certify:build-762
```

The certification command writes `reports/build-762-institutional-trust-transaction.json` with execution identifiers, decision outcome, independent verification result, negative-case matrix, and explicit limitations.

Environment variables used inside the runner (set automatically for the test harness):

- `ABRAXAS_EPHEMERAL_WALLET_AUTH=1`
- `ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER=1`
- Pseudonym salt and test issuer registry fixtures (see `ephemeralSandboxTrustJourney.ts`)

---

## Solana-native role in this transaction

| Layer | Contribution |
| --- | --- |
| Wallet `signMessage` | Proves control of the connected key for **sign-in** and for the **scoped verification request** (operation, resource, policy, expiry). |
| Presentation authorization | Protocol-format possession signature bound to session-generated credential key (sandbox simulation). |
| Issuer evidence | Off-chain Passport reusable credential from sandbox test issuer. |
| Policy and receipt | Server-side evaluation; signed decision receipt. |
| Independent verification | Receipt validation without wallet session; presented receipts are checked against the server-held copy while the receipt remains in ephemeral storage. |
| On-chain program | **Not used** in this journey. Partner-deployed eligibility gates are optional for composable on-chain enforcement. |

---

## Negative cases covered by the runner

- Missing presentation authorization before policy execution  
- Tampered receipt signature at independent verification  
- Replay of consumed presentation commit  
- Cross-scope wallet action binding  
- Presentation authorize without authenticated session  

---

## Related institutional paths

- Partner hosted verification: `docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`  
- Independent Passport bundle verification: `docs/partner-handoff/passport-independent-verifier/README.md`  
- Wallet protocol envelopes: `docs/connect/WALLET_NATIVE_TRUST_PROTOCOL.md`  

---

## Status labels

| Label | This journey |
| --- | --- |
| Implemented | Yes |
| Cryptographically tested | Yes (when `certify:build-762` exits 0) |
| Issuer operational | No (sandbox test issuer) |
| Production authorized | No |
