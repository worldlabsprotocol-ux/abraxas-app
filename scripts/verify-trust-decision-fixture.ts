#!/usr/bin/env npx tsx
// FILE: scripts/verify-trust-decision-fixture.ts
// Operator-runnable receipt signature verification (no production DB required).

import {
  buildCanonicalPayload,
  hashCanonicalPayload,
} from "../lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "../lib/decisionReceipts/signing";
import { subjectPseudonymId } from "../lib/decisionReceipts/pseudonym";

const keyPair = generateTestSigningKeyPair();

const payload = buildCanonicalPayload({
  receipt_id: "dr_fixture_operator",
  schema_version: "1.0.0",
  decision_id: "00000000-0000-4000-8000-000000000001",
  policy_id: "good-trouble-retail-v1",
  policy_version: 1,
  partner_id: "good-trouble-cannabis",
  subject_pseudonym_id: subjectPseudonymId("0xfixture"),
  wallet_binding_ref: null,
  consent_receipt_id: null,
  decision_result: "approved",
  reason_codes: ["all_claims_met"],
  evaluated_claim_refs: [{
    claim_id: "claim-fixture",
    claim_type: "identity_verified",
    issuer_id: "issuer:abraxas",
    status: "active",
    issued_at: "2026-07-30T00:00:00.000Z",
    expires_at: null,
  }],
  issuer_refs: ["issuer:abraxas"],
  decision_context: "sandbox_only",
  evaluated_at: "2026-07-30T12:00:00.000Z",
  expires_at: "2026-07-31T12:00:00.000Z",
});

const { signature, payloadHash } = signReceiptPayload(payload, keyPair.privateKeyJwk);
const valid = verifyReceiptSignature(payload, signature, keyPair.publicKeyJwk);
const tampered = { ...payload, decision_result: "denied" as const };
const tamperedValid = verifyReceiptSignature(tampered, signature, keyPair.publicKeyJwk);

console.log("=== Trust Decision receipt fixture verification ===\n");
console.log(`payload_hash: ${payloadHash}`);
console.log(`computed_hash: ${hashCanonicalPayload(payload)}`);
console.log(`signature_valid (fixture): ${valid}`);
console.log(`signature_valid (tampered): ${tamperedValid}`);

if (!valid || tamperedValid) {
  console.error("\nFAIL: fixture verification did not behave as expected");
  process.exit(1);
}

console.log("\nPASS: signed fixture verifies; tampered payload rejected");
console.log("\nProduction check:");
console.log("  GET /api/receipts/{receipt_id}/public → signature_valid: true");
console.log("  Compare payload_hash to decision_receipts.payload_hash in DB");
