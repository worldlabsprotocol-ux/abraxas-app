// Canonical trust decision envelope — evolves receipt + institutional decision (no parallel receipt).

import { createHash } from "node:crypto";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import { INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA } from "@/lib/institutional/eligibilityDecisionContract";

export const TRUST_DECISION_ENVELOPE_SCHEMA = "abraxas_trust_decision_envelope_v1" as const;
export const TRUST_DECISION_SIGNING_DOMAIN = "abraxas-trust-decision-envelope-v1" as const;

export type ChainAssuranceTier = "off_chain" | "chain_observed" | "chain_required";

export type ChainFinalityStatus =
  | "not_required"
  | "pending"
  | "confirmed"
  | "unavailable"
  | "superseded";

export type TrustDecisionEnvelope = {
  schema: typeof TRUST_DECISION_ENVELOPE_SCHEMA;
  protocol_version: string;
  issuer_identity: string;
  subject_pseudonym_binding: string;
  relying_party_audience: string[];
  policy_id: string;
  policy_version: number;
  policy_commitment_hash: string;
  evidence_assurance_ref: string | null;
  purpose: string | null;
  action_scope: string | null;
  consent_authorization_ref: string | null;
  decision_outcome: string;
  expires_at: string | null;
  revocation_ref: string | null;
  supersession_ref: string | null;
  receipt_id: string;
  receipt_payload_hash: string;
  signature_key_id: string;
  signature_valid: boolean;
  chain_assurance_tier: ChainAssuranceTier;
  chain_commitment_ref: string | null;
  chain_finality: ChainFinalityStatus;
  institutional_decision_schema: typeof INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA;
};

export function hashPolicyCommitment(policyId: string, policyVersion: number): string {
  return createHash("sha256")
    .update(`${TRUST_DECISION_SIGNING_DOMAIN}:policy:${policyId}:${policyVersion}`, "utf8")
    .digest("hex");
}

export function hashTrustDecisionEnvelopePayload(envelope: Omit<TrustDecisionEnvelope, "schema">): string {
  const canonical = canonicalizeJson(envelope as unknown as Record<string, unknown>);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildTrustDecisionEnvelope(input: {
  decision: InstitutionalEligibilityDecision;
  receiptPayload: DecisionReceiptCanonicalPayload;
  receiptPayloadHash: string;
  signingKeyId: string;
  signatureValid: boolean;
  issuerIdentity?: string;
  relyingPartyAudience?: string[];
  consentAuthorizationRef?: string | null;
  revocationRef?: string | null;
  supersessionRef?: string | null;
  evidenceAssuranceRef?: string | null;
  chainAssuranceTier?: ChainAssuranceTier;
  chainCommitmentRef?: string | null;
  chainFinality?: ChainFinalityStatus;
}): TrustDecisionEnvelope {
  return {
    schema: TRUST_DECISION_ENVELOPE_SCHEMA,
    protocol_version: "1.0.0",
    issuer_identity: input.issuerIdentity ?? "abraxas.decision_receipt_issuer",
    subject_pseudonym_binding: input.receiptPayload.subject_pseudonym_id,
    relying_party_audience: input.relyingPartyAudience ?? [input.decision.partner_id],
    policy_id: input.decision.policy_id,
    policy_version: input.decision.policy_version,
    policy_commitment_hash: hashPolicyCommitment(input.decision.policy_id, input.decision.policy_version),
    evidence_assurance_ref: input.evidenceAssuranceRef ?? null,
    purpose: input.decision.purpose,
    action_scope: input.decision.action_scope,
    consent_authorization_ref: input.consentAuthorizationRef ?? input.receiptPayload.consent_receipt_id,
    decision_outcome: input.decision.outcome,
    expires_at: input.decision.receipt_expires_at,
    revocation_ref: input.revocationRef ?? null,
    supersession_ref: input.supersessionRef ?? null,
    receipt_id: input.decision.receipt_id,
    receipt_payload_hash: input.receiptPayloadHash,
    signature_key_id: input.signingKeyId,
    signature_valid: input.signatureValid,
    chain_assurance_tier: input.chainAssuranceTier ?? "off_chain",
    chain_commitment_ref: input.chainCommitmentRef ?? null,
    chain_finality: input.chainFinality ?? "not_required",
    institutional_decision_schema: INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA,
  };
}
