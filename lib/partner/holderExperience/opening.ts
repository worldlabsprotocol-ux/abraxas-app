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

  const footerNotes = walletControl
    ? [
      "This request uses a message signature. It does not authorize a transaction, transfer funds, or grant spending permission.",
    ]
    : [
      input.brief.google_account_only,
      input.brief.method_explanation,
      input.brief.identity_not_default,
    ].filter(Boolean) as string[];

  return {
    headline: walletControl
      ? "Verify wallet control"
      : presentation.requestHeadline,
    requestReason: walletControl
      ? `${input.partnerName} wants to confirm that you control the wallet you connect.`
      : (input.brief.purpose || presentation.requestReason),
    requested: presentation.requested,
    shared: presentation.sharedPreview,
    withheld: walletControl
      ? [
        { label: "Private keys and seed phrases" },
        { label: "Unrelated identity or account data" },
      ]
      : input.brief.withheld.map((label) => ({ label })),
    environmentLabel: input.brief.environment_label,
    environmentDetail: input.brief.environment_detail,
    footerNotes,
  };
}
