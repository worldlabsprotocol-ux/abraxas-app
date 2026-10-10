// Server-side holder reuse hint for partner-flow evaluate (Build #512).

import {
  holderEvidenceReuseHintFromServer,
  publicEvidenceReuseHintPayload,
} from "@/lib/holder/evidenceReuseFromServer";
import { resolveCompatibleReusableFact } from "@/lib/passport/reusableEligibility/qualify";

export type PartnerEvaluateReuseHint = ReturnType<typeof publicEvidenceReuseHintPayload>;

export async function resolvePartnerEvaluateReuseHint(input: {
  subjectId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  /** Evaluate never implies consent — always false at this stage. */
}): Promise<PartnerEvaluateReuseHint | null> {
  const resolved = await resolveCompatibleReusableFact({
    subjectId: input.subjectId,
    targetPolicyId: input.policyId,
    targetPolicyVersion: input.policyVersion,
    relyingPartner: input.partnerId,
  });
  const hint = holderEvidenceReuseHintFromServer({
    reuseState: resolved.ok ? "available" : resolved.state,
    serverDecision: resolved.decision,
    consentGrantedForRequest: false,
  });
  return publicEvidenceReuseHintPayload(hint);
}
