#!/usr/bin/env npx tsx
/**
 * Storage-independent relying-party verification example (Build #530).
 * Distinguishes local cryptographic verification from live Solana RPC observation.
 */
import { verifyIndependentTrustDecision } from "@/lib/protocol/trust/independent/verifyIndependentTrustDecision";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildTrustDecisionEnvelope, hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";

async function main() {
  const partnerId = "example-relying-party";
  const policyId = "sandbox_institutional_protocol_access";
  const policyVersion = 1;

  const decision: InstitutionalEligibilityDecision = {
    schema: "institutional_eligibility_decision_v1",
    outcome: "permit",
    signature_authentic: true,
    currently_actionable: true,
    partner_id: partnerId,
    application_id: null,
    policy_id: policyId,
    policy_version: policyVersion,
    purpose: null,
    action_scope: "sandbox:protocol_access",
    decision_result: "approved",
    receipt_id: "rcpt_example_530",
    receipt_expires_at: null,
    correlation_id: "example",
    validity_state: "active",
    invalidation_reasons: [],
    production_usable: false,
    audit_event_id: null,
  };

  const keyPair = generateTestSigningKeyPair("abraxas-primary");
  const receiptPayload = {
    receipt_id: decision.receipt_id,
    schema_version: "1.0.0",
    decision_id: "decision_example",
    policy_id: policyId,
    policy_version: policyVersion,
    partner_id: partnerId,
    subject_pseudonym_id: "pseudo_example",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved" as const,
    reason_codes: [] as string[],
    evaluated_claim_refs: [] as string[],
    issuer_refs: [] as string[],
    decision_context: "sandbox_only" as const,
    evaluated_at: new Date().toISOString(),
    expires_at: null,
  };

  const { payloadHash, signature } = signReceiptPayload(receiptPayload, keyPair.privateKeyJwk);
  const envelope = buildTrustDecisionEnvelope({
    decision,
    receiptPayload,
    receiptPayloadHash: payloadHash,
    signingKeyId: keyPair.signingKeyId,
    signatureValid: true,
    chainAssuranceTier: "chain_required",
    chainFinality: "pending",
  });

  const trustRegistry: ReceiptVerificationKeyRecord[] = [{
    key_id: keyPair.signingKeyId,
    algorithm: "Ed25519",
    environment: "demo",
    status: "active",
    public_jwk: keyPair.publicKeyJwk as ReceiptVerificationKeyRecord["public_jwk"],
    fingerprint: publicReceiptJwkFingerprint(keyPair.publicKeyJwk as ReceiptVerificationKeyRecord["public_jwk"]),
    issuer_label: "Abraxas",
    issued_at: "2020-01-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    expires_at: null,
    schema_versions: ["1.0.0"],
    reason_class: "active",
    allow_historical_verification: false,
    historical_verify_until: null,
  }];

  const envelopeOffChain = buildTrustDecisionEnvelope({
    decision,
    receiptPayload,
    receiptPayloadHash: payloadHash,
    signingKeyId: keyPair.signingKeyId,
    signatureValid: true,
    chainAssuranceTier: "off_chain",
    chainFinality: "not_required",
  });

  const localOnly = await verifyIndependentTrustDecision({
    bundle: { envelope: envelopeOffChain, receipt_payload: receiptPayload, receipt_signature: signature },
    trust_registry_keys: trustRegistry,
    trust_registry_ref: "https://abraxasworld.xyz/api/receipts/verification-keys",
    immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
    relying_party_id: partnerId,
    require_live_chain_observation: false,
  });

  const withLiveChain = await verifyIndependentTrustDecision({
    bundle: { envelope, receipt_payload: receiptPayload, receipt_signature: signature },
    trust_registry_keys: trustRegistry,
    trust_registry_ref: "https://abraxasworld.xyz/api/receipts/verification-keys",
    immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
    relying_party_id: partnerId,
    commitment_hint: null,
    require_live_chain_observation: true,
  });

  console.log(JSON.stringify({
    example: "independent_relying_party_verify_530",
    local_cryptographic_only: localOnly,
    live_chain_attempt: withLiveChain,
    note: "Live chain observation remains BLOCKED until operator supplies a confirmed devnet commitment transaction.",
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
