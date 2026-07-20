// FILE: lib/agentVerification.ts
// Agent-friendly views for verify → proof → independent check.
// Recommended flow for AI agents and autonomous systems:
//   1. POST /api/credentials/verify
//   2. Read agent.proceed or agent.next_step from response
//   3. GET agent.verify_url (or verify_url) and confirm agent.valid === true
//   4. Act only when both action_allowed and proof independently valid

import type { PartnerDecision, PartnerVerifyResponse, PartnerVerifyResponseWithProof } from "@/lib/partner/partnerDecision";
import type { SelfVerifiedAuthenticationProof } from "@/lib/authenticationProof/verifyProof";
import { siteUrl } from "@/lib/siteUrl";

export const AGENT_VERIFY_SCHEMA = "abraxas.agent.verify.v1" as const;
export const AGENT_PROOF_SCHEMA = "abraxas.agent.proof.v1" as const;

export type AgentNextStep =
  | "verify_proof"
  | "proceed"
  | "deny"
  | "manual_review"
  | "retry";

export interface AgentVerifyView {
  schema: typeof AGENT_VERIFY_SCHEMA;
  /** Single gate: approved decision AND signed proof issued */
  proceed: boolean;
  /** Decision is approved — still requires independent proof check before acting */
  action_allowed: boolean;
  decision: PartnerDecision;
  proof_id: string | null;
  verify_url: string | null;
  proof_available: boolean;
  signature_present: boolean;
  next_step: AgentNextStep;
  reason: string | null;
}

export interface AgentProofView {
  schema: typeof AGENT_PROOF_SCHEMA;
  /** Single gate: signature_valid AND proof_reliable */
  valid: boolean;
  proceed: boolean;
  signature_valid: boolean;
  proof_reliable: boolean;
  anchor_status: SelfVerifiedAuthenticationProof["anchor_status"];
  proof_id: string | null;
  next_step: AgentNextStep;
  reason: string | null;
}

export const AGENT_FLOW_STEPS = [
  "Call POST /api/credentials/verify with record_id, credential_jwt, or sui_address + requested_action",
  "Read response.agent — check action_allowed and proof_available",
  "GET response.verify_url (no API key) and read response.agent.valid",
  "Proceed only when verify agent.next_step is verify_proof AND proof agent.proceed is true",
] as const;

export const AGENT_POSITIONING_SHORT =
  "Built for humans and agents. Abraxas issues cryptographic proofs that both people and AI agents can independently verify before acting on real-world assets.";

export const AGENT_POSITIONING_LONG =
  "As AI agents begin executing real financial and asset actions, they need more than data — they need independently verifiable proof. Abraxas provides portable, cryptographic verification that agents can check before they act.";

export const AGENT_ONE_PAGER = {
  title: "Abraxas for AI Agents",
  what: "Abraxas gives AI agents a way to check whether a person or asset has already been verified — without needing the original documents and without trusting a central server's word alone.",
  flow: [
    "Agent calls the Abraxas verify endpoint.",
    "Abraxas returns a decision + a cryptographic proof.",
    "Agent (or its tools) independently checks the proof.",
    "Agent only proceeds if the proof is valid.",
  ],
  why: "AI agents that can trade, allocate capital, or interact with real-world assets need reliable signals. Abraxas turns verification into something an agent can cryptographically check rather than blindly trust.",
  receives: [
    "Clear decision (approved / denied / manual_review)",
    "proof_id",
    "Cryptographic proof it can verify itself",
    "verify_url for independent validation",
    "agent.proceed and agent.valid booleans for minimal branching logic",
  ],
  principle: "Agents should not have to trust Abraxas. They should be able to verify the proof.",
  mcp_note:
    "Compatible with agentic trading and MCP-connected agents (e.g. Robinhood Agentic Trading) — predictable JSON, agent.proceed / agent.valid gates, no UI required.",
} as const;

function proofIsSigned(proof: PartnerVerifyResponseWithProof["authentication_proof"]): boolean {
  return Boolean(
    proof.signature &&
    proof.signing_key_id &&
    proof.signing_key_id !== "unsigned",
  );
}

export function toAgentVerifyView(
  response: PartnerVerifyResponseWithProof,
): AgentVerifyView {
  const signed = proofIsSigned(response.authentication_proof);
  const actionAllowed = response.decision === "approved";
  const nextStep: AgentNextStep =
    response.decision === "manual_review"
      ? "manual_review"
      : actionAllowed
        ? "verify_proof"
        : "deny";

  return {
    schema: AGENT_VERIFY_SCHEMA,
    proceed: actionAllowed && signed,
    action_allowed: actionAllowed,
    decision: response.decision,
    proof_id: response.proof_id,
    verify_url: response.verify_url,
    proof_available: true,
    signature_present: signed,
    next_step: nextStep,
    reason: signed ? null : "proof_unsigned_or_missing_signature",
  };
}

export function toAgentVerifyViewWithoutProof(
  response: PartnerVerifyResponse,
  reason = "proof_issuance_unavailable",
): AgentVerifyView {
  const actionAllowed = response.decision === "approved";
  const nextStep: AgentNextStep =
    response.decision === "manual_review"
      ? "manual_review"
      : actionAllowed
        ? "retry"
        : "deny";

  return {
    schema: AGENT_VERIFY_SCHEMA,
    proceed: false,
    action_allowed: actionAllowed,
    decision: response.decision,
    proof_id: null,
    verify_url: null,
    proof_available: false,
    signature_present: false,
    next_step: nextStep,
    reason,
  };
}

export function toAgentProofView(
  proof: SelfVerifiedAuthenticationProof,
): AgentProofView {
  const valid = proof.signature_valid && proof.proof_reliable;

  return {
    schema: AGENT_PROOF_SCHEMA,
    valid,
    proceed: valid,
    signature_valid: proof.signature_valid,
    proof_reliable: proof.proof_reliable,
    anchor_status: proof.anchor_status,
    proof_id: proof.proof_id,
    next_step: valid ? "proceed" : "deny",
    reason: valid
      ? null
      : !proof.signature_valid
        ? "signature_invalid"
        : "proof_not_reliable",
  };
}

export function toAgentProofNotFoundView(proofId: string): AgentProofView {
  return {
    schema: AGENT_PROOF_SCHEMA,
    valid: false,
    proceed: false,
    signature_valid: false,
    proof_reliable: false,
    anchor_status: "signed",
    proof_id: proofId,
    next_step: "deny",
    reason: "proof_not_found",
  };
}

/** Machine-readable agent integration guide */
export function getAgentVerificationGuide() {
  return {
    version: "2026-07-20",
    base_url: siteUrl(),
    positioning: {
      short: AGENT_POSITIONING_SHORT,
      long: AGENT_POSITIONING_LONG,
    },
    one_pager: AGENT_ONE_PAGER,
    recommended_flow: AGENT_FLOW_STEPS,
    endpoints: {
      verify: {
        method: "POST",
        path: "/api/credentials/verify",
        agent_field: "agent",
        agent_schema: AGENT_VERIFY_SCHEMA,
        proceed_when: "agent.proceed === true (then confirm via proof lookup)",
        key_fields: ["decision", "proof_id", "verify_url", "authentication_proof", "agent"],
      },
      proof_lookup: {
        method: "GET",
        path: "/api/proof/{proof_id}",
        agent_field: "agent",
        agent_schema: AGENT_PROOF_SCHEMA,
        proceed_when: "agent.valid === true",
        key_fields: ["signature_valid", "proof_reliable", "public_key", "payload", "agent"],
      },
    },
    decision_tree: {
      verify_response: {
        "agent.next_step === verify_proof": "GET verify_url, check agent.valid",
        "agent.next_step === deny": "Do not proceed",
        "agent.next_step === manual_review": "Escalate or hold",
        "agent.next_step === retry": "Decision approved but proof missing — retry or fail closed",
      },
      proof_response: {
        "agent.valid === true": "Safe to proceed (subject to your policy)",
        "agent.valid === false": "Fail closed",
      },
    },
    docs_page: siteUrl("/docs/ai-agents"),
    relying_party_docs: siteUrl("/docs/relying-party-verify"),
  };
}
