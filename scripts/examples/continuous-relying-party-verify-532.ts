#!/usr/bin/env npx tsx
/**
 * Continuous authorization example (Build #532):
 * 1) accept valid auth 2) cache result 3) observe revocation 4) deny 5) RPC outage -> UNAVAILABLE
 */
import { verifyContinuousTrustAuthorization } from "@/lib/protocol/trust/independent/verifyContinuousTrustAuthorization";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildTrustDecisionEnvelope, hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";

async function main() {
  const partnerId = "example-relying-party";
  const policyId = "sandbox_institutional_protocol_access";
  const policyVersion = 1;
  const policyHash = hashPolicyCommitment(policyId, policyVersion);

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
    receipt_id: "rcpt_continuous_532",
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
    chainAssuranceTier: "off_chain",
    chainFinality: "not_required",
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

  const baseInput = {
    bundle: { envelope, receipt_payload: receiptPayload, receipt_signature: signature },
    trust_registry_keys: trustRegistry,
    trust_registry_ref: "https://abraxasworld.xyz/api/receipts/verification-keys",
    immutable_policy_commitment_hash: policyHash,
    relying_party_id: partnerId,
    require_live_chain_observation: false,
  };

  const step1 = await verifyContinuousTrustAuthorization(baseInput);
  const step2 = await verifyContinuousTrustAuthorization({
    ...baseInput,
    verification_cache: step1.cache,
  });
  const step3 = await verifyContinuousTrustAuthorization({
    ...baseInput,
    revocation_evidence: {
      schema: "abraxas_revocation_evidence_v1",
      revoked: true,
      evidence_ref: "operator_revocation_fixture",
    },
  });
  const step4 = await verifyContinuousTrustAuthorization({
    ...baseInput,
    verification_cache: step2.cache,
    rpc_available: false,
    require_live_chain_observation: true,
    bundle: {
      ...baseInput.bundle,
      envelope: buildTrustDecisionEnvelope({
        decision,
        receiptPayload,
        receiptPayloadHash: payloadHash,
        signingKeyId: keyPair.signingKeyId,
        signatureValid: true,
        chainAssuranceTier: "chain_required",
        chainFinality: "pending",
      }),
    },
  });

  console.log(JSON.stringify({
    example: "continuous_relying_party_verify_532",
    step1_valid_accepted: step1.outcome,
    step2_cache_written: step2.cache?.cache_key,
    step3_revocation_denied: step3.outcome,
    step4_rpc_outage: step4.outcome,
    live_devnet_revocation_tx: "BLOCKED — no authorized devnet fixture in agent environment",
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
