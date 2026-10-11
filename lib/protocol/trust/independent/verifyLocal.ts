// Storage-independent cryptographic verification for trust decisions (Build #530).

import { hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import {
  TRUST_DECISION_ENVELOPE_SCHEMA,
  buildTrustDecisionEnvelope,
  hashPolicyCommitment,
  hashTrustDecisionEnvelopePayload,
} from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { IndependentTrustVerificationInput } from "@/lib/protocol/trust/independent/contract";
import { resolveIssuerPublicKey, issuerRegistrySnapshotFromKeys } from "@/lib/protocol/trust/independent/issuerRegistry";
import { evaluateChainAssurance } from "@/lib/protocol/trust/chainAssuranceVerifier";
import type { InstitutionalEligibilityOutcome } from "@/lib/institutional/eligibilityDecisionContract";

export type LocalVerificationResult = {
  ok: boolean;
  reasons: string[];
  issuerRegistry: ReturnType<typeof issuerRegistrySnapshotFromKeys>;
  policyCommitmentOk: boolean;
  receiptPayloadHash: string;
  envelopePayloadHash: string;
  chainAssurance: ReturnType<typeof evaluateChainAssurance>;
};

export function verifyLocalTrustDecision(input: IndependentTrustVerificationInput): LocalVerificationResult {
  const reasons: string[] = [];
  const { envelope, receipt_payload, receipt_signature } = input.bundle;
  const now = input.now ?? new Date();

  if (envelope.schema !== TRUST_DECISION_ENVELOPE_SCHEMA) {
    return failLocal(input, ["envelope_schema_mismatch"]);
  }

  if (input.immutable_policy_commitment_hash !== envelope.policy_commitment_hash) {
    return failLocal(input, ["immutable_policy_commitment_mismatch"]);
  }

  const expectedPolicyHash = hashPolicyCommitment(envelope.policy_id, envelope.policy_version);
  if (expectedPolicyHash !== envelope.policy_commitment_hash) {
    reasons.push("policy_commitment_integrity_fail");
  }

  const key = resolveIssuerPublicKey({
    keyId: envelope.signature_key_id,
    keys: input.trust_registry_keys,
    now,
  });
  if (!key.ok) {
    reasons.push(`issuer_key_${key.reason}`);
  }

  const receiptPayloadHash = hashCanonicalPayload(receipt_payload);
  if (receiptPayloadHash !== envelope.receipt_payload_hash) {
    reasons.push("receipt_payload_hash_mismatch");
  }

  let signatureValid = false;
  if (key.ok) {
    signatureValid = verifyReceiptSignature(receipt_payload, receipt_signature, key.key.public_jwk);
    if (!signatureValid) reasons.push("receipt_signature_invalid");
  }

  const recomputed = buildTrustDecisionEnvelope({
    decision: {
      schema: envelope.institutional_decision_schema,
      outcome: envelope.decision_outcome as InstitutionalEligibilityOutcome,
      signature_authentic: true,
      currently_actionable: true,
      partner_id: envelope.relying_party_audience[0] ?? input.relying_party_id,
      application_id: null,
      policy_id: envelope.policy_id,
      policy_version: envelope.policy_version,
      purpose: envelope.purpose,
      action_scope: envelope.action_scope,
      decision_result: envelope.decision_outcome === "permit" ? "approved" : "denied",
      receipt_id: envelope.receipt_id,
      receipt_expires_at: envelope.expires_at,
      correlation_id: "independent-verify",
      validity_state: "active",
      invalidation_reasons: [],
      production_usable: false,
      audit_event_id: null,
    },
    receiptPayload: receipt_payload,
    receiptPayloadHash,
    signingKeyId: envelope.signature_key_id,
    signatureValid,
    issuerIdentity: envelope.issuer_identity,
    relyingPartyAudience: envelope.relying_party_audience,
    consentAuthorizationRef: envelope.consent_authorization_ref,
    revocationRef: envelope.revocation_ref,
    supersessionRef: envelope.supersession_ref,
    evidenceAssuranceRef: envelope.evidence_assurance_ref,
    chainAssuranceTier: envelope.chain_assurance_tier,
    chainCommitmentRef: envelope.chain_commitment_ref,
    chainFinality: envelope.chain_finality,
  });

  const envelopePayloadHash = hashTrustDecisionEnvelopePayload(
    { ...recomputed, schema: undefined } as Omit<typeof recomputed, "schema">,
  );
  void envelopePayloadHash;

  if (!envelope.relying_party_audience.includes(input.relying_party_id)) {
    reasons.push("audience_mismatch");
  }

  if (envelope.expires_at) {
    const exp = Date.parse(envelope.expires_at);
    if (!Number.isNaN(exp) && now.getTime() >= exp) {
      reasons.push("decision_expired");
    }
  }

  if (input.revocation_evidence?.revoked === true || envelope.revocation_ref) {
    reasons.push("revocation_active");
  }

  if (input.revocation_evidence?.superseded_by_receipt_id) {
    reasons.push("supersession_active");
  }

  const issuerRegistry = issuerRegistrySnapshotFromKeys(input.trust_registry_keys);

  const chainTierForLocal =
    envelope.chain_assurance_tier === "chain_required" && !input.commitment_hint
      ? "off_chain"
      : envelope.chain_assurance_tier;

  const chainAssurance = evaluateChainAssurance({
    tier: chainTierForLocal,
    policyId: envelope.policy_id,
    policyVersion: envelope.policy_version,
    policyCommitmentHash: envelope.policy_commitment_hash,
    signingKeyId: envelope.signature_key_id,
    issuerRegistry,
    commitment: input.commitment_hint ?? null,
    inclusionProof: input.inclusion_proof,
    dbClaimsPermit: input.abraxas_db_claims_permit,
    chainObservedAvailable: input.require_live_chain_observation === false ? true : undefined,
  });

  if (chainAssurance.verdict === "fail") {
    reasons.push(...chainAssurance.reasons);
  }

  if (
    envelope.chain_assurance_tier === "chain_required"
    && input.commitment_hint
    && input.abraxas_db_claims_permit
  ) {
    const chainBound = evaluateChainAssurance({
      tier: "chain_required",
      policyId: envelope.policy_id,
      policyVersion: envelope.policy_version,
      policyCommitmentHash: envelope.policy_commitment_hash,
      signingKeyId: envelope.signature_key_id,
      issuerRegistry,
      commitment: input.commitment_hint,
      dbClaimsPermit: true,
      chainObservedAvailable: true,
    });
    if (chainBound.verdict === "fail") {
      reasons.push(...chainBound.reasons);
    }
  }

  const policyCommitmentOk = expectedPolicyHash === envelope.policy_commitment_hash
    && input.immutable_policy_commitment_hash === envelope.policy_commitment_hash;

  return {
    ok: reasons.length === 0 && chainAssurance.verdict !== "fail",
    reasons,
    issuerRegistry,
    policyCommitmentOk,
    receiptPayloadHash,
    envelopePayloadHash,
    chainAssurance,
  };
}

function failLocal(input: IndependentTrustVerificationInput, reasons: string[]): LocalVerificationResult {
  const issuerRegistry = issuerRegistrySnapshotFromKeys(input.trust_registry_keys);
  return {
    ok: false,
    reasons,
    issuerRegistry,
    policyCommitmentOk: false,
    receiptPayloadHash: "",
    envelopePayloadHash: "",
    chainAssurance: evaluateChainAssurance({
      tier: input.bundle.envelope.chain_assurance_tier,
      policyId: input.bundle.envelope.policy_id,
      policyVersion: input.bundle.envelope.policy_version,
      policyCommitmentHash: input.bundle.envelope.policy_commitment_hash,
      signingKeyId: input.bundle.envelope.signature_key_id,
      issuerRegistry,
      commitment: null,
    }),
  };
}
