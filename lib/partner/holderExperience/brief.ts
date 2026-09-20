// FILE: lib/partner/holderExperience/brief.ts
// Server-derived holder request brief. No return URLs or policy internals.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
} from "@/lib/partner/launchpad/policyPacks";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { HOLDER_GOOGLE_ACCOUNT_ONLY } from "./contract";

export interface HolderRequestBrief {
  requestor: string;
  purpose: string;
  result: string;
  withheld: string[];
  environment_label: string;
  environment_detail: string;
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
  const sandbox = pack ? policyPackIsSandboxOnly(pack) : input.environment === "sandbox";
  const purpose = input.userExplanation?.trim()
    || pack?.holder_explanation
    || (input.purpose ? `Confirm the requested ${input.purpose.replace(/_/g, " ")} result.` : "Confirm the selected policy result.");
  const result = input.disclosedResult?.trim()
    || pack?.partner_receives
    || "A yes/no policy result. Not your documents or date of birth.";
  const withheld = pack?.partner_does_not_receive?.length
    ? pack.partner_does_not_receive
    : ["date of birth", "government ID images", "legal name", "email"];

  return {
    requestor,
    purpose,
    result,
    withheld,
    environment_label: sandbox ? "Sandbox / test" : "Partner verification",
    environment_detail: sandbox
      ? "This is a sandbox or test request. A passing result here is not Production-usable."
      : "The partner receives only the policy result. Production use still depends on that partner’s reviewed access.",
    google_account_only: HOLDER_GOOGLE_ACCOUNT_ONLY,
    identity_not_default: IDENTITY_NOT_DEFAULT,
  };
}
