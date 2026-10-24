# Build #819 — Independently authenticated status evidence

**Baseline:** PR **#818 merged** · Production unchanged

## 1. Gap confirmed (#818)

`abraxas_receipt_status_evidence` v1 was **unsigned JSON**. Any party could forge `receipt_status: active` and satisfy the independent verifier’s freshness checks. That made hosted or MITM status responses a latent trust root.

## 2. Model selected

**Per-receipt signed status statements** (`abraxas_signed_receipt_status_statement` v1):

- Individual attestations (not a full registry replay) — minimal privacy surface (receipt id only, no holder fields)
- **Monotonic `status_version`** per receipt with sovereign PG checkpoint — anti-replay / rollback
- **TTL** via `statement_expires_at` plus bundle `status_statement_max_age_seconds`
- Status signers authorized in **SIAS** `status_signers[]` (same anchor trust chain as issuer keys)

Alternatives considered: signed batches (higher verifier cost), global commitment log (more infrastructure) — rejected for sovereign slice scope.

## 3. Evidence contract

See `packages/abraxas-independent-verifier/src/types.ts` — `ReceiptStatusStatementPayload`, `SignedReceiptStatusStatement`.

Verify path: `verifySignedReceiptStatusStatement` + `verifyAbraxasReceiptIndependently` v1.1.0.

Unsigned v1 status JSON is **rejected** (`unsigned_status_evidence_rejected`).

## 4. Status-signer lifecycle

- Env (sovereign / CI only): `ABRAXAS_STATUS_SIGNER_KEY_ID`, `ABRAXAS_STATUS_SIGNER_*_JWK`
- Published in SIAS via `buildFromRegistry.ts` → `status_signers`
- Revocation: mark signer `revoked` in next SIAS registry version (same pattern as receipt keys)

## 5. Sovereign issuance

`publishSignedReceiptStatusFromSovereignEvaluation` — reads `evaluateSovereignCurrentValidity`, bumps `sovereign_receipt_status_checkpoints`, signs statement. **Not** a new billable decision.

## 6. Privacy

Status statements bind receipt id, partner/policy scope, and boolean freshness flags — **no** `subject_pseudonym_id` or wallet fields.

## 7. Remaining trust dependencies

- Trust anchor still pinned out-of-band
- Status signer list trusted via SIAS (anchor-signed)
- Absolute real-time revocation not claimed for offline verifiers beyond freshness bounds

## 8. Tests

- `signedStatus.adversarial.test.ts`
- Updated `independentVerifier.adversarial.test.ts`, harness, sovereign operational proof integration

## 9. Production restrictions

Unchanged — no Production anchor publication, migrations, or billing.

## 10. Next gate

External sovereign staging: full trust contract demo (anchor + SIAS + signed status) on an Abraxas-attested host (#816).
