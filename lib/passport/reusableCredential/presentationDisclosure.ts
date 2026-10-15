// FILE: lib/passport/reusableCredential/presentationDisclosure.ts

import type { PassportPresentationRequestDisclosure } from "./contract";

export function buildPresentationRequestDisclosure(input: {
  credentialId: string;
  partnerId: string;
  partnerLabel: string;
  policyId: string;
  requestedAttribute: string;
}): PassportPresentationRequestDisclosure {
  return {
    credential_id: input.credentialId,
    relying_party_id: input.partnerId,
    relying_party_label: input.partnerLabel,
    policy_id: input.policyId,
    requested_attribute: input.requestedAttribute,
    purpose: "Confirm eligibility for this partner's policy without resubmitting identity documents.",
    partner_receives: `A signed partner-bound authorization receipt scoped to ${input.partnerId} — not your reusable credential file and not underlying IDV evidence.`,
  };
}
