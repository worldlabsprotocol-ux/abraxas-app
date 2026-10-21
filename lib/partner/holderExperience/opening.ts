// FILE: lib/partner/holderExperience/opening.ts
// Holder opening screen copy — plain language, policy-derived disclosure.

import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { WALLET_CONTROL_RESULT_FAMILY } from "@/lib/walletControl/contract";
import type { HolderRequestBrief } from "./brief";

export interface HolderOpeningPresentation {
  headline: string;
  requestReason: string;
  requested: Array<{ label: string }>;
  shared: Array<{ label: string }>;
  withheld: Array<{ label: string }>;
  environmentLabel: string;
  environmentDetail: string;
  footerNotes: string[];
}

export function buildHolderOpeningPresentation(input: {
  partnerName: string;
  policyId: string;
  brief: HolderRequestBrief;
  purpose?: string | null;
}): HolderOpeningPresentation {
  const presentation = buildHolderRequestPresentation(input.partnerName, input.policyId, {
    requestedAction: input.purpose,
  });

  const pack = inferPolicyPackFromPolicyId(input.policyId);
  const walletControl = pack?.disclosed_result === WALLET_CONTROL_RESULT_FAMILY;

  const footerNotes = [
    input.brief.google_account_only,
    walletControl
      ? "Wallet approval is a message-only signature. It does not move funds or grant token spending."
      : null,
    input.brief.method_explanation,
    input.brief.identity_not_default,
  ].filter(Boolean) as string[];

  return {
    headline: presentation.requestHeadline,
    requestReason: input.brief.purpose || presentation.requestReason,
    requested: presentation.requested,
    shared: presentation.sharedPreview,
    withheld: input.brief.withheld.map((label) => ({ label })),
    environmentLabel: input.brief.environment_label,
    environmentDetail: input.brief.environment_detail,
    footerNotes,
  };
}
