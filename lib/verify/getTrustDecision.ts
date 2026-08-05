// FILE: lib/verify/getTrustDecision.ts
// Fetch a Trust Decision for a relying party (decision primary, receipt as proof).

import { getDecisionStatus } from "@/lib/verification/requestsService";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { buildTrustDecision } from "@/lib/verify/trustDecision";

export async function getTrustDecisionForRelyingParty(
  decisionId: string,
  relyingPartyId: string,
): Promise<ReturnType<typeof buildTrustDecision> | null> {
  const decision = await getDecisionStatus(decisionId);
  if (!decision) return null;
  if (decision.partner_id !== relyingPartyId) return null;

  const receipt = await getReceiptByDecisionId(decisionId);
  const trustEvaluation = receipt
    ? await evaluateDecisionReceiptTrust(receipt, {
        partnerId: relyingPartyId,
        policyId: decision.policy_id,
      })
    : null;
  return buildTrustDecision({ decision, receipt, trustEvaluation });
}
