// FILE: lib/product/holderRequestPresentation.ts
// Plain-language holder request copy derived from canonical policy presentation.

import { buildPolicyPresentationFromPolicyId } from "@/lib/partner/launchpad/policyPresentation";
import { normalizeProtectedFields } from "@/lib/protocol/decisionReceiptDisplay";

export interface HolderRequestPresentation {
  requestHeadline: string;
  completionHeadline: string;
  requestReason: string;
  requested: Array<{ label: string }>;
  sharedPreview: Array<{ label: string }>;
  sharedResult: Array<{ label: string }>;
  withheld: Array<{ label: string }>;
}

function defaultWithheld(policyId: string): Array<{ label: string }> {
  return normalizeProtectedFields(policyId).map((label) => ({ label }));
}

export function buildHolderRequestPresentation(
  partnerName: string,
  policyId: string,
  options: {
    requestedAction?: string | null;
    disclosedResult?: string | null;
  } = {},
): HolderRequestPresentation {
  const presentation = buildPolicyPresentationFromPolicyId(policyId);
  const withheld = presentation?.withheld?.length
    ? presentation.withheld.map((label) => ({ label }))
    : defaultWithheld(policyId);

  if (!presentation) {
    const fallbackQuestion = options.requestedAction?.replace(/_/g, " ") ?? "Eligibility verification";
    return {
      requestHeadline: `${partnerName} is requesting verification.`,
      completionHeadline: `${partnerName} received your eligibility answer.`,
      requestReason: "Required before this service can continue.",
      requested: [{ label: fallbackQuestion }],
      sharedPreview: [{ label: "Eligibility result only" }],
      sharedResult: [{ label: "Eligibility result: Yes" }],
      withheld,
    };
  }

  const question = options.requestedAction?.replace(/_/g, " ")
    ?? presentation.question
    ?? presentation.title;
  const sharedLabel = presentation.shared_label;
  const resultSuffix = options.disclosedResult?.replace(/_/g, " ") ?? "Yes";

  return {
    requestHeadline: `${partnerName} wants to confirm ${presentation.title.toLowerCase()}.`,
    completionHeadline: `${partnerName} can now confirm that you meet its ${presentation.title.toLowerCase()} requirement.`,
    requestReason: presentation.question,
    requested: [{ label: question }],
    sharedPreview: [{ label: `${sharedLabel} (if approved)` }],
    sharedResult: [{ label: `${sharedLabel}: ${resultSuffix}` }],
    withheld,
  };
}
