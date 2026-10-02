// FILE: lib/partner/externalActivation/firstProofEligibility.ts
// Deterministic first-proof eligibility — no parallel receipt factory.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsEconomicDemo,
  policyPackRequiresIdentityEvidence,
  resolvePolicyPack,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import { isContentOriginDisclosurePolicyId } from "@/lib/provenance/constants";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { deriveServerSandboxQualificationClaims } from "@/lib/partner/sandboxQualificationClaims";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

const EXTERNAL_ACTIVATION_PATH = "/developers/integration-studio";

export type DeterministicFirstProofMode = "sandbox_economic_demo";

export interface DeterministicFirstProofEligibility {
  ok: true;
  mode: DeterministicFirstProofMode;
  pack: PolicyPack;
}

export interface DeterministicFirstProofIneligible {
  ok: false;
  code: "live_holder_required" | "policy_not_deterministic" | "unknown_policy";
  detail: string;
  remediation_href: string;
}

export type FirstProofEligibilityResult =
  | DeterministicFirstProofEligibility
  | DeterministicFirstProofIneligible;

const LIVE_HOLDER_REMEDIATION =
  "/developers/launchpad?view=test";

export function assessDeterministicFirstProofEligibility(
  app: LaunchpadApplicationRow,
): FirstProofEligibilityResult {
  const pack = inferPolicyPackFromPolicyId(app.policy_id) ?? resolvePolicyPack(app.policy_template_id);
  if (!pack) {
    return {
      ok: false,
      code: "unknown_policy",
      detail: "Could not resolve the selected policy pack.",
      remediation_href: EXTERNAL_ACTIVATION_PATH,
    };
  }

  if (policyPackIsEconomicDemo(pack)) {
    return { ok: true, mode: "sandbox_economic_demo", pack };
  }

  if (isContentOriginDisclosurePolicyId(app.policy_id)) {
    return {
      ok: false,
      code: "live_holder_required",
      detail:
        "Content provenance cannot be satisfied deterministically without a real artifact fingerprint and holder attestation. Run the live sandbox holder flow with your selected policy.",
      remediation_href: `${LIVE_HOLDER_REMEDIATION}&app=${encodeURIComponent(app.id)}`,
    };
  }

  if (policyPackRequiresIdentityEvidence(pack) || pack.required_claims.includes("identity_verified")) {
    return {
      ok: false,
      code: "live_holder_required",
      detail:
        "This policy requires holder evidence that cannot be generated deterministically. Run the live sandbox holder flow with your selected policy — do not substitute another policy.",
      remediation_href: `${LIVE_HOLDER_REMEDIATION}&app=${encodeURIComponent(app.id)}`,
    };
  }

  return {
    ok: false,
    code: "policy_not_deterministic",
    detail:
      "This policy cannot be satisfied by deterministic sandbox fixtures. Run the live sandbox holder flow with your selected policy.",
    remediation_href: `${LIVE_HOLDER_REMEDIATION}&app=${encodeURIComponent(app.id)}`,
  };
}

export function buildSandboxEconomicDemoEvidence(input: {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  subjectId: string;
}): CredentialClaimRecord[] {
  const qualified = evaluateMethodQualification({
    methodId: "privacy_preserving",
    storedPartnerId: input.partnerId,
    storedPolicyId: input.policyId,
    storedPolicyVersion: input.policyVersion,
    verifyRequestId: input.verifyRequestId,
  });
  if (!qualified.ok) return [];
  return deriveServerSandboxQualificationClaims({
    record: qualified.record,
    subjectId: input.subjectId,
    storedPartnerId: input.partnerId,
    storedPolicyId: input.policyId,
    storedPolicyVersion: input.policyVersion,
  });
}
