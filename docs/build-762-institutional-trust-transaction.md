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

## Verification guarantees (read carefully)

| Guarantee | Automated runner | Production-grade meaning |
| --- | --- | --- |
| **Session-independent** | Yes — POST validate does not require holder browser or wallet session | Relying party submits a receipt JSON without Abraxas session cookies |
| **Server-record integrity** | Yes — presented fields must match Abraxas ephemeral storage while the record exists | Detects tampered `signature` / `payload_hash` relative to the record Abraxas issued |
| **Standalone cryptographic verification** | **No** for ephemeral sandbox receipts | Does **not** verify Ed25519 against the public verification-key registry; ephemeral test keys are not published for offline verification |

Interactive browser wallet flows (for example Phantom) use the same route handlers but are exercised separately from this automated certification.

---

## Reproduce locally (automated)

Prerequisites: Node 24, repository dependencies installed.

```bash
npm run test:build-762-institutional-trust
npm run certify:build-762
```

The certification command runs Vitest (local imported HTTP route handlers), then writes `reports/build-762-institutional-trust-transaction.json` with the current `commit_sha`, execution identifiers, verification metadata, negative-case matrix, and limitations.

**Wallet proof in the runner:** programmatic Solana `Keypair` signing real challenge bytes (`test_wallet_ed25519_sign_message`). This is not an interactive browser wallet approval.

Environment variables used inside the runner (set automatically for the test harness):

- `ABRAXAS_EPHEMERAL_WALLET_AUTH=1`
- `ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER=1`
- Pseudonym salt and test issuer registry fixtures (see `ephemeralSandboxTrustJourney.ts`)

---

## Solana-native role in this transaction

| Layer | Contribution |
| --- | --- |
| Wallet `signMessage` | Proves control of the signing key for **sign-in** and for the **scoped verification request** (operation, resource, policy, expiry). |
| Presentation authorization | Protocol-format possession signature bound to session-generated credential key (sandbox simulation). |
| Issuer evidence | Off-chain Passport reusable credential from sandbox test issuer. |
| Policy and receipt | Server-side evaluation; signed decision receipt. |
| Session-independent validation | POST validate without wallet session; fail-closed match to server-held ephemeral record. |
| On-chain program | **Not used** in this journey. Partner-deployed eligibility gates are optional for composable on-chain enforcement. |

---

## Negative cases covered by the runner

- Missing presentation authorization before policy execution  
- Tampered receipt signature (server-record mismatch)  
- Unknown or evicted server record  
- Expired server record acceptability  
- Replay of consumed presentation commit  
- Cross-scope wallet action binding  
- Presentation authorize without authenticated session  

Unit tests additionally cover missing `payload_hash`, missing server record, and forged client `signature_valid` flags.

---

## Validate API fields (additive)

`POST /api/auth/wallet/sandbox/validate` responses include:

- `session_independent` — always `true` for this endpoint  
- `server_record_integrity_verified` — presented receipt matches server-held copy  
- `standalone_cryptographic_verification` — `false` for ephemeral sandbox receipts  
- `signature_authentic` — legacy aggregate: integrity + policy gates (not registry-backed standalone crypto)
- `signature_authentic_basis` — always `sandbox_server_record_and_policy_gates` for this endpoint

---

## Related institutional paths

- Partner hosted verification: `docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`  
- Independent Passport bundle verification: `docs/partner-handoff/passport-independent-verifier/README.md`  
- Wallet protocol envelopes: `docs/connect/WALLET_NATIVE_TRUST_PROTOCOL.md`  

---

## Status labels (report schema `build-762-v2`)

| Label | This journey |
| --- | --- |
| Implemented | Yes |
| Session-independent verification demonstrated | Yes (when certify exits 0) |
| Fail-closed integrity verified | Yes (negative matrix passes) |
| Standalone cryptographic verification | No |
| Issuer operational | No (sandbox test issuer) |
| Production authorized | No |
