// FILE: lib/partner/launchpad/customPolicy.ts
// Constrained sandbox policy composer. Partners choose declarative requirements, never executable code.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules, RequiredClaimRule } from "@/lib/policy/types";

export const CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID = "custom_sandbox";

export const CUSTOM_LAUNCHPAD_CLAIMS = [
  { id: "identity_verified", label: "Verified identity", description: "An identity credential issued by an accepted provider." },
  { id: "liveness_passed", label: "Liveness", description: "The holder completed an active liveness check." },
  { id: "wallet_binding_confirmed", label: "Wallet binding", description: "The holder proved control of the connected wallet." },
  { id: "residency_country", label: "Residency", description: "A residency credential is active." },
  { id: "screening_outcome", label: "Screening outcome", description: "A required screening credential is active." },
] as const;

export type CustomLaunchpadClaimId = typeof CUSTOM_LAUNCHPAD_CLAIMS[number]["id"];

export interface CustomLaunchpadPolicyInput {
  name: string;
  userExplanation: string;
  requiredClaimIds: string[];
  minimumAssurance: AssuranceLevel;
  receiptLifetimeHours: number;
}

export type CustomLaunchpadPolicyResult =
  | { ok: true; rules: PartnerPolicyRules; userExplanation: string }
  | { ok: false; code: "custom_policy_name_invalid" | "custom_policy_explanation_invalid" | "custom_policy_claims_invalid" | "custom_policy_assurance_invalid" | "custom_policy_receipt_lifetime_invalid" };

const claimIds = new Set<string>(CUSTOM_LAUNCHPAD_CLAIMS.map((claim) => claim.id));
const assuranceLevels = new Set<AssuranceLevel>(["L0", "L1", "L2", "L3", "L4"]);

export function buildCustomLaunchpadSandboxPolicy(input: CustomLaunchpadPolicyInput): CustomLaunchpadPolicyResult {
  const name = input.name.trim();
  const explanation = input.userExplanation.trim();
  const claims = Array.from(new Set(input.requiredClaimIds.map((claim) => claim.trim())));
  const lifetime = Number(input.receiptLifetimeHours);

  if (name.length < 3 || name.length > 80) return { ok: false, code: "custom_policy_name_invalid" };
  if (explanation.length < 10 || explanation.length > 280) return { ok: false, code: "custom_policy_explanation_invalid" };
  if (claims.length === 0 || claims.length > 5 || claims.some((claim) => !claimIds.has(claim))) {
    return { ok: false, code: "custom_policy_claims_invalid" };
  }
  if (!assuranceLevels.has(input.minimumAssurance)) return { ok: false, code: "custom_policy_assurance_invalid" };
  if (!Number.isInteger(lifetime) || lifetime < 1 || lifetime > 168) {
    return { ok: false, code: "custom_policy_receipt_lifetime_invalid" };
  }

  const requiredClaims: RequiredClaimRule[] = claims.map((claimType) => ({
    claim_type: claimType,
    min_assurance: input.minimumAssurance,
  }));

  return {
    ok: true,
    userExplanation: explanation,
    rules: {
      sandbox_only: true,
      account_required: true,
      consent_required: true,
      session_receipt_hours: lifetime,
      required_claims: requiredClaims,
    },
  };
}
