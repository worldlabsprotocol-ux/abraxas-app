// FILE: lib/progressiveProof/evidenceRouting.ts
// Map missing claim types to the lowest-friction evidence step.

import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { ProofEvidenceStep } from "@/lib/progressiveProof/types";

const CLAIM_TO_EVIDENCE: Record<string, ProofEvidenceStep> = {
  self_attested_age_band: "self_attest",
  product_eligibility: "identity_documents",
  identity_verified: "identity_documents",
  government_id_verified: "identity_documents",
  liveness_passed: "liveness",
  residency_country: "residency",
  wallet_binding_confirmed: "bind_wallet",
};

export function resolveNextEvidenceStep(input: {
  signedIn: boolean;
  walletBound: boolean;
  consentGranted: boolean;
  policyRules: PartnerPolicyRules;
  missingClaimTypes: string[];
}): ProofEvidenceStep | null {
  if (!input.signedIn) return "sign_in";
  if (input.policyRules.consent_required && !input.consentGranted) return "consent";
  if (!input.walletBound && input.missingClaimTypes.includes("wallet_binding_confirmed")) {
    return "bind_wallet";
  }

  if (input.policyRules.browse_access_only) {
    if (input.missingClaimTypes.includes("self_attested_age_band")) return "self_attest";
    return null;
  }

  for (const missing of input.missingClaimTypes) {
    const step = CLAIM_TO_EVIDENCE[missing];
    if (step) return step;
  }

  if (input.missingClaimTypes.some((c) => c.includes("age") || c === "product_eligibility")) {
    return "age_assurance";
  }

  return input.missingClaimTypes.length > 0 ? "identity_documents" : null;
}
