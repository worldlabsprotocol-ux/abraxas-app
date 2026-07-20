// FILE: lib/agentVerification.test.ts

import { describe, expect, it } from "vitest";
import {
  toAgentVerifyView,
  toAgentVerifyViewWithoutProof,
  toAgentProofView,
  toAgentProofNotFoundView,
  getAgentVerificationGuide,
  AGENT_VERIFY_SCHEMA,
  AGENT_PROOF_SCHEMA,
} from "./agentVerification";
import type { PartnerVerifyResponseWithProof } from "@/lib/partner/partnerDecision";
import type { SelfVerifiedAuthenticationProof } from "@/lib/authenticationProof/verifyProof";

const signedProofResponse: PartnerVerifyResponseWithProof = {
  decision: "approved",
  status: "active",
  assurance_level: 3,
  policy_id: "abraxas-verify-v1",
  policy_version: "2026-07-08",
  decision_reference: "abx-dec-test",
  valid_until: null,
  record_id: "ABX-RE-HOSP-001",
  proof_id: "aprx_test01",
  verify_url: "https://example.com/api/proof/aprx_test01",
  authentication_proof: {
    proof_id: "aprx_test01",
    payload_hash: "a".repeat(64),
    signature: "sig",
    signing_key_id: "abraxas-primary",
    anchor_status: "signed",
    sui_tx_digest: null,
    explorer_url: null,
    verify_url: "https://example.com/api/proof/aprx_test01",
    issued_at: "2026-07-20T00:00:00.000Z",
    event_type: "credential_verify",
    record_id: "abx-dec-test",
    network: "devnet",
    status: "active",
  },
  decision_receipt: null,
};

const selfVerifiedProof: SelfVerifiedAuthenticationProof = {
  artifact_type: "authentication_proof",
  independently_verifiable: true,
  proof_id: "aprx_test01",
  payload: {
    proof_id: "aprx_test01",
    schema_version: "1.0.0",
    event_type: "credential_verify",
    record_id: "abx-dec-test",
    payload_hash: "a".repeat(64),
    issued_at: "2026-07-20T00:00:00.000Z",
    network: "devnet",
  },
  signature: "sig",
  signing_key_id: "abraxas-primary",
  public_key: { kty: "OKP", crv: "Ed25519", x: "abc" },
  signature_valid: true,
  payload_hash: "a".repeat(64),
  anchor_status: "signed",
  sui_network: "devnet",
  sui_tx_digest: null,
  explorer_url: null,
  issued_at: "2026-07-20T00:00:00.000Z",
  event_type: "credential_verify",
  record_id: "abx-dec-test",
  anchor_note: "signed",
  proof_status: "active",
  proof_reliable: true,
  superseded_by: null,
  asset_abx_id: "ABX-RE-HOSP-001",
};

describe("agentVerification", () => {
  it("maps signed verify response to agent view", () => {
    const agent = toAgentVerifyView(signedProofResponse);
    expect(agent.schema).toBe(AGENT_VERIFY_SCHEMA);
    expect(agent.proceed).toBe(true);
    expect(agent.next_step).toBe("verify_proof");
    expect(agent.proof_id).toBe("aprx_test01");
  });

  it("maps denied response without proof", () => {
    const agent = toAgentVerifyViewWithoutProof({
      decision: "denied",
      status: "not_found",
      assurance_level: 0,
      policy_id: "abraxas-verify-v1",
      policy_version: "2026-07-08",
      decision_reference: "abx-dec-deny",
      valid_until: null,
    });
    expect(agent.proceed).toBe(false);
    expect(agent.next_step).toBe("deny");
    expect(agent.proof_available).toBe(false);
  });

  it("maps valid proof to agent proceed", () => {
    const agent = toAgentProofView(selfVerifiedProof);
    expect(agent.schema).toBe(AGENT_PROOF_SCHEMA);
    expect(agent.valid).toBe(true);
    expect(agent.proceed).toBe(true);
    expect(agent.next_step).toBe("proceed");
  });

  it("maps invalid signature to deny", () => {
    const agent = toAgentProofView({ ...selfVerifiedProof, signature_valid: false, proof_reliable: false });
    expect(agent.valid).toBe(false);
    expect(agent.reason).toBe("signature_invalid");
  });

  it("maps not found proof", () => {
    const agent = toAgentProofNotFoundView("aprx_missing");
    expect(agent.valid).toBe(false);
    expect(agent.reason).toBe("proof_not_found");
  });

  it("exports machine-readable guide", () => {
    const guide = getAgentVerificationGuide();
    expect(guide.endpoints.verify.agent_schema).toBe(AGENT_VERIFY_SCHEMA);
    expect(guide.recommended_flow).toHaveLength(4);
    expect(guide.agentic_finance_stack.schema).toBe("abraxas.agentic_finance.v1");
    expect(guide.agentic_finance_stack.robinhood_reference.mcp_url).toContain("agent.robinhood.com");
  });
});
