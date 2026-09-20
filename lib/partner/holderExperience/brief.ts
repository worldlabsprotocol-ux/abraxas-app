// FILE: lib/partner/holderExperience/brief.ts
// Server-derived holder request brief. No return URLs or policy internals.

import { inferPolicyPackFromPolicyId, policyPackIsSandboxOnly } from "@/lib/partner/launchpad/policyPacks";
import { planEligibilityMethods } from "@/lib/partner/eligibilityMethods";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { HOLDER_GOOGLE_ACCOUNT_ONLY } from "./contract";
import { applyDisclosureProfile, resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";
import { GENERIC_MINIMAL_PROFILE } from "@/lib/privacy/selectiveDisclosure/profiles";

export interface HolderRequestBrief {
  requestor: string;
  purpose: string;
  result: string;
  shared_result_category: string;
  withheld: string[];
  environment_label: string;
  environment_detail: string;
  method_explanation: string;
  google_account_only: string;
  identity_not_default: string;
}

const IDENTITY_NOT_DEFAULT =
  "Identity or liveness is never the default first step. Choose the qualifying method this policy allows, then consent. Selecting a method does not issue a result.";

export function buildHolderRequestBrief(input: {
  partnerId?: string | null;
  partnerName?: string | null;
  policyId?: string | null;
  purpose?: string | null;
  environment?: string | null;
  disclosedResult?: string | null;
  userExplanation?: string | null;
}): HolderRequestBrief {
  const pack = input.policyId ? inferPolicyPackFromPolicyId(input.policyId) : null;
  const requestor = (input.partnerName?.trim() || resolvePartnerDisplayName(input.partnerId ?? "")) || "This partner";
  const sandbox = input.environment === "sandbox" || Boolean(pack && policyPackIsSandboxOnly(pack));
  const purpose = input.userExplanation?.trim()
    || pack?.holder_explanation
    || (input.purpose ? `Confirm the requested ${input.purpose.replace(/_/g, " ")} result.` : "Confirm the selected policy result.");
  const result = input.disclosedResult?.trim()
    || pack?.partner_receives
    || "A yes/no policy result. Not your documents or date of birth.";
  const withheld = profileWithheld(pack);
  const resultCategory = pack?.disclosed_result
    ? `Policy result: ${pack.disclosed_result}`
    : "eligibility confirmed";
  const plan = pack ? planEligibilityMethods({ pack, privacyPreservingAvailable: true }) : null;
  const primary = plan?.methods.find((method) => method.primary && method.qualifies)
    ?? plan?.methods.find((method) => method.qualifies && method.id !== "account_login");

  const brief: HolderRequestBrief = {
    requestor,
    purpose,
    result,
    shared_result_category: resultCategory,
    withheld,
    environment_label: sandbox ? "Sandbox / test" : "Partner verification",
    environment_detail: sandbox
      ? "This is a sandbox or test request. A passing result here is not Production-usable."
      : "The partner receives only the policy result. Production use still depends on that partner’s reviewed access.",
    method_explanation: primary
      ? `${primary.label}. ${primary.why}`
      : IDENTITY_NOT_DEFAULT,
    google_account_only: HOLDER_GOOGLE_ACCOUNT_ONLY,
    identity_not_default: IDENTITY_NOT_DEFAULT,
  };
  const sealed = applyDisclosureProfile(brief, packProfile(pack), "holder_brief");
  if (!sealed.ok) {
    return {
      requestor: "This partner",
      purpose: "Confirm the selected policy result.",
      result: "A yes/no policy result.",
      shared_result_category: "eligibility confirmed",
      withheld: ["date of birth", "government ID images", "legal name", "email"],
      environment_label: "Sandbox / test",
      environment_detail: "This is a sandbox or test request. A passing result here is not Production-usable.",
      method_explanation: IDENTITY_NOT_DEFAULT,
      google_account_only: HOLDER_GOOGLE_ACCOUNT_ONLY,
      identity_not_default: IDENTITY_NOT_DEFAULT,
    };
  }
  return sealed.payload as unknown as HolderRequestBrief;
}

function packProfile(pack: ReturnType<typeof inferPolicyPackFromPolicyId>) {
  if (!pack) return GENERIC_MINIMAL_PROFILE;
  const resolved = resolveDisclosureProfile(pack.id);
  return resolved.ok ? resolved.profile : GENERIC_MINIMAL_PROFILE;
}

function profileWithheld(pack: ReturnType<typeof inferPolicyPackFromPolicyId>): string[] {
  if (!pack) return ["date of birth", "government ID images", "legal name", "email"];
  const resolved = resolveDisclosureProfile(pack.id);
  if (!resolved.ok) return pack.partner_does_not_receive.slice();
  return [...resolved.profile.withheld];
}
