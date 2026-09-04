// FILE: lib/partner/partnerProofAgent.ts
// Narrow tool interface for Abraxas Proof Agent — deterministic server enforcement beneath.

import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { getHolderCredentialStatus } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { buildAssuranceBoundarySummary, TOKEN_HOLDINGS_NEVER_ELIGIBILITY } from "@/lib/partner/assuranceBoundary";
import {
  mapFlowNextStepToJourneyState,
  partnerJourneyPartnerIntro,
  resolvePartnerJourneyPresentation,
} from "@/lib/partner/partnerJourneyStateMachine";
import { getPolicy } from "@/lib/verification/requestsService";
import { policyExplicitlyRequiresProductEligibility } from "@/lib/policy/evaluatePolicy";
import type { PartnerFlowNextStep } from "@/lib/partner/relyingPartyFlow";

export const PARTNER_PROOF_AGENT_SCHEMA = "abraxas.partner.proof_agent.v1" as const;

export interface PartnerProofAgentInspectInput {
  partner_id: string;
  policy_id: string;
  sui_address: string;
}

export interface PartnerProofAgentInspectResult {
  schema: typeof PARTNER_PROOF_AGENT_SCHEMA;
  partner_id: string;
  policy_id: string;
  /** Minimum assurance the policy requires — never satisfied by sign-in alone. */
  minimum_assurance_required: string | null;
  suitable_evidence_exists: boolean;
  evidence_expired: boolean;
  next_step: PartnerFlowNextStep;
  journey_state: string;
  customer_message: string;
  partner_intro: string;
  assurance_boundary: ReturnType<typeof buildAssuranceBoundarySummary>;
  /** Agent may explain; must not override policy or issue receipts. */
  agent_may_initiate_verification: boolean;
  agent_may_not: readonly string[];
  token_holdings_affect_eligibility: false;
}

const AGENT_MAY_NOT = [
  "receive_raw_identity_documents",
  "access_unrestricted_pii",
  "create_evidence",
  "override_policy",
  "approve_based_on_authentication_or_token_holdings",
  "issue_receipts_outside_server_flow",
  "reveal_secrets_or_internal_rules",
] as const;

export async function inspectPartnerPolicyForAgent(
  input: PartnerProofAgentInspectInput,
): Promise<PartnerProofAgentInspectResult> {
  const partnerId = input.partner_id.trim();
  const policyId = input.policy_id.trim();
  const suiAddress = input.sui_address.trim();

  if (!partnerId || !policyId || !suiAddress) {
    throw new Error("partner_id, policy_id, and sui_address are required");
  }

  const policy = await getPolicy(policyId);
  if (!policy) throw new Error("Policy not found");

  const credential = await getHolderCredentialStatus(suiAddress);
  let next: PartnerFlowNextStep = "passport";
  let suitable = false;
  let expired = credential.status === "expired";

  if (credential.status === "pending_review") {
    next = "pending_review";
  } else if (credential.status === "active" && credential.credential_jti) {
    const { evaluation } = await evaluatePolicyForSubject({
      suiAddress,
      policyId,
      partnerId,
    });
    if (evaluation.decision === "approved") {
      next = "enter";
      suitable = true;
    } else if (evaluation.decision === "manual_review") {
      next = "pending_review";
    } else {
      next = "denied";
    }
  } else if (credential.status === "revoked") {
    next = "denied";
  }

  const productEligibilityRequired = policyExplicitlyRequiresProductEligibility(policy.rules_json);
  const identityVerified = credential.status === "active";
  const assurance = buildAssuranceBoundarySummary({
    policyId,
    identityVerified,
    productEligibilityVerified: suitable,
    productEligibilityRequired,
    minimumAge: policy.rules_json.minimum_age,
  });

  const journeyState = mapFlowNextStepToJourneyState(next);
  const presentation = resolvePartnerJourneyPresentation(journeyState);

  return {
    schema: PARTNER_PROOF_AGENT_SCHEMA,
    partner_id: partnerId,
    policy_id: policyId,
    minimum_assurance_required: productEligibilityRequired ? "L2_product_eligibility" : "L2_identity",
    suitable_evidence_exists: suitable,
    evidence_expired: expired,
    next_step: next,
    journey_state: journeyState,
    customer_message: presentation.customer_message,
    partner_intro: partnerJourneyPartnerIntro("Partner"),
    assurance_boundary: assurance,
    agent_may_initiate_verification: next === "passport",
    agent_may_not: AGENT_MAY_NOT,
    token_holdings_affect_eligibility: TOKEN_HOLDINGS_NEVER_ELIGIBILITY ? false : false,
  };
}

export async function validatePartnerProofAgentRequest(input: {
  partner_id: string;
  policy_id: string;
  return_url?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.partner_id?.trim() || !input.policy_id?.trim()) {
    return { ok: false, error: "partner_id and policy_id required" };
  }
  if (input.return_url) {
    const allowed = await isAllowedPartnerReturnUrl(input.partner_id, input.return_url);
    if (!allowed) return { ok: false, error: "return_url not allowlisted" };
  }
  return { ok: true };
}
