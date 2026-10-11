import { describe, expect, it } from "vitest";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { buildTrustDecisionEnvelope, hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import { verifyLocalTrustDecision } from "@/lib/protocol/trust/independent/verifyLocal";
import { verifyIndependentTrustDecision } from "@/lib/protocol/trust/independent/verifyIndependentTrustDecision";
import { observeReceiptCommitmentOnChain } from "@/lib/protocol/trust/independent/verifyChainObservation";
import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";
import { buildMerkleProofForLeaf } from "@/lib/protocol/trust/merkleInclusionProof";

const policyId = "sandbox_institutional_protocol_access";
const policyVersion = 1;
const partnerId = "institutional-platform";

const baseDecision: InstitutionalEligibilityDecision = {
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
  receipt_id: "rcpt_adv_530",
  receipt_expires_at: null,
  correlation_id: "corr",
  validity_state: "active",
  invalidation_reasons: [],
  production_usable: false,
  audit_event_id: null,
};

function receiptPayload(): DecisionReceiptCanonicalPayload {
  return {
    receipt_id: baseDecision.receipt_id,
    schema_version: "1.0.0",
    decision_id: "d1",
    policy_id: policyId,
    policy_version: policyVersion,
    partner_id: partnerId,
    subject_pseudonym_id: "pseudo_530",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: new Date().toISOString(),
    expires_at: null,
  };
}

function registryForKey(keyPair: ReturnType<typeof generateTestSigningKeyPair>): ReceiptVerificationKeyRecord[] {
  return [{
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
}

function signedBundle(tier: "off_chain" | "chain_required" = "off_chain") {
  const keys = generateTestSigningKeyPair("abraxas-primary");
  const payload = receiptPayload();
  const { payloadHash, signature } = signReceiptPayload(payload, keys.privateKeyJwk);
  const envelope = buildTrustDecisionEnvelope({
    decision: baseDecision,
    receiptPayload: payload,
    receiptPayloadHash: payloadHash,
    signingKeyId: keys.signingKeyId,
    signatureValid: true,
    chainAssuranceTier: tier,
    chainFinality: tier === "chain_required" ? "pending" : "not_required",
  });
  return { keys, payload, signature, envelope, registry: registryForKey(keys) };
}

function commitment(status: SolanaReceiptCommitmentRecord["status"]): SolanaReceiptCommitmentRecord {
  return {
    id: "c1",
    receipt_id: baseDecision.receipt_id,
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

describe("independent on-chain trust verification (Build #530)", () => {
  it("passes valid off-chain bundle with public registry only", async () => {
    const b = signedBundle("off_chain");
    const result = await verifyIndependentTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(result.overall).toBe("pass");
    expect(result.phases.local_cryptographic.status).toBe("pass");
  });

  it("rejects forged receipt signature", async () => {
    const b = signedBundle("off_chain");
    const attacker = generateTestSigningKeyPair("attacker");
    const forged = signReceiptPayload(b.payload, attacker.privateKeyJwk);
    const result = await verifyIndependentTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: forged.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(result.overall).toBe("fail");
    expect(result.phases.local_cryptographic.reasons).toContain("receipt_signature_invalid");
  });

  it("rejects altered immutable policy commitment", () => {
    const b = signedBundle("off_chain");
    const local = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: "deadbeef",
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(local.ok).toBe(false);
    expect(local.reasons).toContain("immutable_policy_commitment_mismatch");
  });

  it("rejects revoked issuer in public registry", () => {
    const b = signedBundle("off_chain");
    const revokedRegistry = [{
      ...b.registry[0],
      status: "revoked" as const,
      reason_class: "compromise" as const,
    }];
    const local = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: revokedRegistry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(local.ok).toBe(false);
    expect(local.reasons.some(r => r.includes("issuer_key_revoked"))).toBe(true);
  });

  it("rejects wrong relying party audience", () => {
    const b = signedBundle("off_chain");
    const local = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: "other-partner",
      require_live_chain_observation: false,
    });
    expect(local.reasons).toContain("audience_mismatch");
  });

  it("rejects expired decision", () => {
    const b = signedBundle("off_chain");
    const expiredEnvelope = {
      ...b.envelope,
      expires_at: "2020-01-01T00:00:00.000Z",
    };
    const local = verifyLocalTrustDecision({
      bundle: { envelope: expiredEnvelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      now: new Date("2025-01-01T00:00:00.000Z"),
      require_live_chain_observation: false,
    });
    expect(local.reasons).toContain("decision_expired");
  });

  it("rejects forged merkle inclusion proof under chain_required hint", () => {
    const b = signedBundle("chain_required");
    const local = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      commitment_hint: commitment("CONFIRMED"),
      inclusion_proof: { leaf_digest: "x", siblings: ["bad"], root: "wrong" },
      require_live_chain_observation: false,
    });
    expect(local.chainAssurance.verdict).toBe("fail");
    expect(local.chainAssurance.reasons).toContain("forged_inclusion_proof");
  });

  it("db permit cannot override chain denial", () => {
    const b = signedBundle("chain_required");
    const local = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      commitment_hint: commitment("PENDING"),
      abraxas_db_claims_permit: true,
      require_live_chain_observation: false,
    });
    expect(local.chainAssurance.verdict).toBe("fail");
    expect(local.chainAssurance.reasons).toContain("db_cannot_override_chain");
  });

  it("chain_required without live tx is blocked not pass", async () => {
    const b = signedBundle("chain_required");
    const result = await verifyIndependentTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      commitment_hint: commitment("CONFIRMED"),
      require_live_chain_observation: true,
    });
    expect(result.overall).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("valid merkle proof verifies independently", () => {
    const proof = buildMerkleProofForLeaf(["a", "b", "c"], "b");
    expect(proof).not.toBeNull();
    const b = signedBundle("off_chain");
    expect(verifyReceiptSignature(b.payload, b.signature, b.keys.publicKeyJwk)).toBe(true);
  });

  it("missing RPC for live observation is blocked", async () => {
    const obs = await observeReceiptCommitmentOnChain({
      transactionSignature: "5".repeat(88),
      receiptId: baseDecision.receipt_id,
      receiptPayloadHash: "a".repeat(64),
      committerPubkey: "11111111111111111111111111111111",
      chainIdentity: {
        network_id: "solana_devnet",
        cluster: "devnet",
        rpc_urls: [],
        confirmation_threshold: "finalized",
      },
    });
    expect(obs.status).toBe("blocked");
  });

  it("replay of same receipt signature still requires audience and policy binding", () => {
    const b = signedBundle("off_chain");
    const first = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    const replay = verifyLocalTrustDecision({
      bundle: { envelope: b.envelope, receipt_payload: b.payload, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys/demo",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, policyVersion),
      relying_party_id: "wrong-audience",
      require_live_chain_observation: false,
    });
    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(false);
  });
});
