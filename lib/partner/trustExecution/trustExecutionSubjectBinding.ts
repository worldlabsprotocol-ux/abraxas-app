// FILE: lib/partner/trustExecution/trustExecutionSubjectBinding.ts
// Authoritative subject pseudonym for wallet-scoped trust execution (no caller-supplied seed).

import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";

export function bindTrustExecutionSubjectPseudonym(input: {
  partnerId: string;
  applicationId: string;
  walletAddress: string;
}): string {
  const material = [
    "wallet_trust_execution_v1",
    input.partnerId.trim(),
    input.applicationId.trim(),
    input.walletAddress.trim(),
  ].join(":");
  return subjectPseudonymId(material);
}
