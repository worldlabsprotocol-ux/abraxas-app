import { describe, expect, it } from "vitest";
import { evaluateChainAssurance, verifyPolicyCommitment } from "@/lib/protocol/trust/chainAssuranceVerifier";
import { hashPolicyCommitment, buildTrustDecisionEnvelope } from "@/lib/protocol/trust/trustDecisionEnvelope";
import { buildMerkleProofForLeaf, verifyMerkleInclusion } from "@/lib/protocol/trust/merkleInclusionProof";
import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";

const registry = {
  authorized_signer_key_ids: ["abraxas-primary"],
  revoked_signer_key_ids: [] as string[],
};

const baseDecision: InstitutionalEligibilityDecision = {
  schema: "institutional_eligibility_decision_v1",
  outcome: "permit",
  signature_authentic: true,
  currently_actionable: true,
  partner_id: "institutional-platform",
  application_id: null,
  policy_id: "sandbox_institutional_protocol_access",
  policy_version: 1,
  purpose: null,
  action_scope: null,
  decision_result: "approved",
  receipt_id: "rcpt_test",
  receipt_expires_at: null,
  correlation_id: "corr",
  validity_state: "active",
  invalidation_reasons: [],
  production_usable: false,
  audit_event_id: null,
};

function commitment(status: SolanaReceiptCommitmentRecord["status"]): SolanaReceiptCommitmentRecord {
  return {
    id: "c1",
    receipt_id: "rcpt_test",
    cluster: "devnet",
    network_id: "solana_devnet",
    status,
    commitment_digest: "abc",
    payload_hash: "def",
    committer_pubkey: "pub",
    memo_payload: null,
    transaction_signature: status === "CONFIRMED" ? "sig" : null,
    slot: 1,
    confirmation_status: status === "CONFIRMED" ? "finalized" : null,
    failure_class: null,
    failure_detail: null,
    submission_attempts: 1,
    idempotency_key: "k",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: null,
    confirmed_at: null,
    superseded_at: null,
  };
}

describe("adversarial verification suite (Build #529)", () => {
  it("1 accepts valid signed receipt with valid policy commitment", () => {
    const hash = hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version);
    const r = evaluateChainAssurance({
      tier: "off_chain",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hash,
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: null,
    });
    expect(r.verdict).toBe("pass");
  });

  it("2 rejects modified policy commitment", () => {
    const r = evaluateChainAssurance({
      tier: "off_chain",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: "deadbeef",
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: null,
    });
    expect(r.verdict).toBe("fail");
  });

  it("3 rejects revoked issuer", () => {
    const r = evaluateChainAssurance({
      tier: "off_chain",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "revoked-key",
      issuerRegistry: { authorized_signer_key_ids: ["abraxas-primary"], revoked_signer_key_ids: ["revoked-key"] },
      commitment: null,
    });
    expect(r.verdict).toBe("fail");
  });

  it("4 rejects superseded chain commitment", () => {
    const r = evaluateChainAssurance({
      tier: "chain_required",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: commitment("SUPERSEDED"),
      chainObservedAvailable: true,
    });
    expect(r.verdict).toBe("fail");
  });

  it("5 rejects forged inclusion proof", () => {
    const r = evaluateChainAssurance({
      tier: "chain_required",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: commitment("CONFIRMED"),
      inclusionProof: { leaf_digest: "x", siblings: ["bad"], root: "wrong" },
      chainObservedAvailable: true,
    });
    expect(r.verdict).toBe("fail");
  });

  it("6 unfinalized commitment cannot satisfy chain_required pass", () => {
    const r = evaluateChainAssurance({
      tier: "chain_required",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: commitment("SUBMITTED"),
      chainObservedAvailable: true,
    });
    expect(r.verdict).not.toBe("pass");
  });

  it("7 database permit cannot override conflicting chain state", () => {
    const r = evaluateChainAssurance({
      tier: "chain_required",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: commitment("PENDING"),
      dbClaimsPermit: true,
      chainObservedAvailable: true,
    });
    expect(r.verdict).toBe("fail");
    expect(r.reasons).toContain("db_cannot_override_chain");
  });

  it("8 independent verifier uses public proof math without DB credentials", () => {
    const leaves = ["digest-a", "digest-b", "digest-c"];
    const proof = buildMerkleProofForLeaf(leaves, "digest-b");
    expect(proof).not.toBeNull();
    expect(verifyMerkleInclusion(proof!)).toBe(true);
    expect(verifyPolicyCommitment({
      policyId: "p",
      policyVersion: 1,
      observedCommitmentHash: hashPolicyCommitment("p", 1),
    })).toBe(true);
  });

  it("9 chain outage yields unavailable not permit", () => {
    const r = evaluateChainAssurance({
      tier: "chain_required",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: null,
      chainObservedAvailable: false,
    });
    expect(r.verdict).toBe("unavailable");
  });

  it("10 off_chain tier remains usable without blockchain", () => {
    const r = evaluateChainAssurance({
      tier: "off_chain",
      policyId: baseDecision.policy_id,
      policyVersion: baseDecision.policy_version,
      policyCommitmentHash: hashPolicyCommitment(baseDecision.policy_id, baseDecision.policy_version),
      signingKeyId: "abraxas-primary",
      issuerRegistry: registry,
      commitment: null,
      chainObservedAvailable: false,
    });
    expect(r.verdict).toBe("pass");
  });

  it("envelope preserves privacy fields (no PII keys)", () => {
    const envelope = buildTrustDecisionEnvelope({
      decision: baseDecision,
      receiptPayload: {
        receipt_id: "rcpt_test",
        schema_version: "1.0.0",
        decision_id: "d",
        policy_id: baseDecision.policy_id,
        policy_version: 1,
        partner_id: baseDecision.partner_id,
        subject_pseudonym_id: "pseudo_abc",
        wallet_binding_ref: null,
        consent_receipt_id: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "sandbox_only",
        evaluated_at: new Date().toISOString(),
        expires_at: null,
      },
      receiptPayloadHash: "abc123",
      signingKeyId: "abraxas-primary",
      signatureValid: true,
    });
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toMatch(/birth|biometric|legal_name|ssn/i);
    expect(envelope.subject_pseudonym_binding).toBe("pseudo_abc");
  });
});
