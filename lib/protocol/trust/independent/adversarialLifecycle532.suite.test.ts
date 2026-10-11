import { describe, expect, it } from "vitest";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { buildTrustDecisionEnvelope, hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import { verifyContinuousTrustAuthorization } from "@/lib/protocol/trust/independent/verifyContinuousTrustAuthorization";
import { writeVerificationCacheEntry, DEFAULT_HIGH_ASSURANCE_CACHE_POLICY } from "@/lib/protocol/trust/independent/verificationCache";

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
  receipt_id: "rcpt_lifecycle_532",
  receipt_expires_at: null,
  correlation_id: "corr",
  validity_state: "active",
  invalidation_reasons: [],
  production_usable: false,
  audit_event_id: null,
};

function payload(): DecisionReceiptCanonicalPayload {
  return {
    receipt_id: baseDecision.receipt_id,
    schema_version: "1.0.0",
    decision_id: "d1",
    policy_id: policyId,
    policy_version: policyVersion,
    partner_id: partnerId,
    subject_pseudonym_id: "pseudo_532",
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

function registry(keyPair: ReturnType<typeof generateTestSigningKeyPair>): ReceiptVerificationKeyRecord[] {
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

function bundle(tier: "off_chain" | "chain_required" = "off_chain") {
  const keys = generateTestSigningKeyPair("abraxas-primary");
  const p = payload();
  const { payloadHash, signature } = signReceiptPayload(p, keys.privateKeyJwk);
  const envelope = buildTrustDecisionEnvelope({
    decision: baseDecision,
    receiptPayload: p,
    receiptPayloadHash: payloadHash,
    signingKeyId: keys.signingKeyId,
    signatureValid: true,
    chainAssuranceTier: tier,
    chainFinality: tier === "chain_required" ? "pending" : "not_required",
  });
  return { keys, p, signature, envelope, registry: registry(keys), policyHash: hashPolicyCommitment(policyId, policyVersion) };
}

describe("continuous authorization lifecycle (Build #532)", () => {
  it("accepts currently valid off-chain authorization", async () => {
    const b = bundle("off_chain");
    const r = await verifyContinuousTrustAuthorization({
      bundle: { envelope: b.envelope, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(r.outcome).toBe("PERMIT");
    expect(r.authorization_lifecycle_state).toBe("ACTIVE");
  });

  it("denies after authoritative revocation evidence", async () => {
    const b = bundle("off_chain");
    const first = await verifyContinuousTrustAuthorization({
      bundle: { envelope: b.envelope, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      require_live_chain_observation: false,
    });
    expect(first.outcome).toBe("PERMIT");

    const denied = await verifyContinuousTrustAuthorization({
      bundle: { envelope: b.envelope, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      require_live_chain_observation: false,
      revocation_evidence: { schema: "abraxas_revocation_evidence_v1", revoked: true, evidence_ref: "evt_1" },
    });
    expect(denied.outcome).toBe("DENY");
    expect(denied.authorization_lifecycle_state).toBe("REVOKED");
  });

  it("does not reuse stale PERMIT cache during RPC outage (high assurance)", async () => {
    const b = bundle("chain_required");
    const cache = writeVerificationCacheEntry({
      cache_key: `${b.envelope.receipt_id}:${partnerId}:${b.policyHash}`,
      outcome: "PERMIT",
      reasons: [],
      observed_at: new Date(Date.now() - 120_000),
      policy: DEFAULT_HIGH_ASSURANCE_CACHE_POLICY,
      commitment_slot: 100,
      invalidation_slot: null,
    });
    const r = await verifyContinuousTrustAuthorization({
      bundle: { envelope: b.envelope, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      verification_cache: cache,
      rpc_available: false,
      require_live_chain_observation: true,
    });
    expect(r.outcome).toBe("UNAVAILABLE");
    expect(r.reasons).toContain("rpc_unavailable_stale_cache_rejected");
  });

  it("chain_required without fresh observation is UNAVAILABLE not PERMIT", async () => {
    const b = bundle("chain_required");
    const r = await verifyContinuousTrustAuthorization({
      bundle: { envelope: b.envelope, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      require_live_chain_observation: true,
      rpc_available: true,
    });
    expect(r.outcome).toBe("UNAVAILABLE");
    expect(r.blockers).toContain("chain_required_fresh_observation");
  });

  it("distinguishes expired authorization", async () => {
    const b = bundle("off_chain");
    const expiredEnv = { ...b.envelope, expires_at: "2020-01-01T00:00:00.000Z" };
    const r = await verifyContinuousTrustAuthorization({
      bundle: { envelope: expiredEnv, receipt_payload: b.p, receipt_signature: b.signature },
      trust_registry_keys: b.registry,
      trust_registry_ref: "fixture://keys",
      immutable_policy_commitment_hash: b.policyHash,
      relying_party_id: partnerId,
      now: new Date("2025-01-01T00:00:00.000Z"),
      require_live_chain_observation: false,
    });
    expect(r.outcome).toBe("DENY");
    expect(r.authorization_lifecycle_state).toBe("EXPIRED");
  });
});
