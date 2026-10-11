import { describe, expect, it } from "vitest";
import { verifyProgramEnforcedTrustState } from "@/lib/protocol/trust/independent/verifyProgramEnforcedTrust";
import { verifyContinuousTrustAuthorization } from "@/lib/protocol/trust/independent/verifyContinuousTrustAuthorization";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildTrustDecisionEnvelope, hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";

describe("program-enforced trust (Build #533)", () => {
  it("rejects memo-only revocation when program enforcement required", async () => {
    const r = await verifyProgramEnforcedTrustState({
      receiptPayloadHash: "a".repeat(64),
      policyCommitmentHash: "b".repeat(64),
      registryDomainHex: "c".repeat(64),
      rpcUrl: "https://api.devnet.solana.com",
      rejectMemoOnlyRevocation: true,
      memoRevocationSupplied: true,
    });
    expect(r.outcome).toBe("DENY");
    expect(r.reasons).toContain("memo_only_revocation_insufficient_for_program_enforced");
  });

  it("db permit cannot override on-chain DENY when program enforced", async () => {
    const partnerId = "institutional-platform";
    const policyId = "sandbox_institutional_protocol_access";
    const keys = generateTestSigningKeyPair("abraxas-primary");
    const decision: InstitutionalEligibilityDecision = {
      schema: "institutional_eligibility_decision_v1",
      outcome: "permit",
      signature_authentic: true,
      currently_actionable: true,
      partner_id: partnerId,
      application_id: null,
      policy_id: policyId,
      policy_version: 1,
      purpose: null,
      action_scope: null,
      decision_result: "approved",
      receipt_id: "rcpt_prog_533",
      receipt_expires_at: null,
      correlation_id: "c",
      validity_state: "active",
      invalidation_reasons: [],
      production_usable: false,
      audit_event_id: null,
    };
    const payload = {
      receipt_id: decision.receipt_id,
      schema_version: "1.0.0",
      decision_id: "d",
      policy_id: policyId,
      policy_version: 1,
      partner_id: partnerId,
      subject_pseudonym_id: "pseudo",
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
    const { payloadHash, signature } = signReceiptPayload(payload, keys.privateKeyJwk);
    const envelope = buildTrustDecisionEnvelope({
      decision,
      receiptPayload: payload,
      receiptPayloadHash: payloadHash,
      signingKeyId: keys.signingKeyId,
      signatureValid: true,
      chainAssuranceTier: "chain_required",
    });
    const registry: ReceiptVerificationKeyRecord[] = [{
      key_id: keys.signingKeyId,
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      public_jwk: keys.publicKeyJwk as ReceiptVerificationKeyRecord["public_jwk"],
      fingerprint: publicReceiptJwkFingerprint(keys.publicKeyJwk as ReceiptVerificationKeyRecord["public_jwk"]),
      issuer_label: "Abraxas",
      issued_at: "2020-01-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: null,
      schema_versions: ["1.0.0"],
      reason_class: "active",
      allow_historical_verification: false,
      historical_verify_until: null,
    }];

    const r = await verifyContinuousTrustAuthorization({
      bundle: { envelope, receipt_payload: payload, receipt_signature: signature },
      trust_registry_keys: registry,
      trust_registry_ref: "fixture",
      immutable_policy_commitment_hash: hashPolicyCommitment(policyId, 1),
      relying_party_id: partnerId,
      program_enforced_assurance: true,
      registry_domain_hex: "ab".repeat(32),
      abraxas_db_claims_permit: true,
      revocation_evidence: { schema: "abraxas_revocation_evidence_v1", revoked: true, evidence_ref: "memo" },
      require_live_chain_observation: false,
    });
    expect(r.outcome).toBe("DENY");
    expect(r.reasons.some(x => x.includes("db_cannot_override") || x.includes("memo_only"))).toBe(true);
  });
});
