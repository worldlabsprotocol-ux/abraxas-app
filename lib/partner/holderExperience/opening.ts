// FILE: lib/partner/holderExperience/opening.ts
// Holder opening screen copy — plain language, policy-derived disclosure.

import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
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

  return {
    headline: presentation.requestHeadline,
    requestReason: input.brief.purpose || presentation.requestReason,
    requested: presentation.requested,
    shared: [{ label: input.brief.result }],
    withheld: input.brief.withheld.map((label) => ({ label })),
    environmentLabel: input.brief.environment_label,
    environmentDetail: input.brief.environment_detail,
    footerNotes: [
      input.brief.google_account_only,
      input.brief.method_explanation,
      input.brief.identity_not_default,
    ].filter(Boolean),
  };
}
