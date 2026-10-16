// FILE: lib/partner/build584/liveIndependentReceiptVerification.ts
// Live receipt verification — not local synthetic harness matrix.

import type { LiveStepResult } from "@/lib/partner/build584/liveInstitutionalHttpJourney";

export type LiveReceiptVerificationInput = {
  receiptReference: string | null;
  partnerId: string | null;
  policyId: string | null;
  verifierOutcome: "pass" | "fail" | "blocked";
  verifiedAt: string | null;
  detail: string;
};

export function buildLiveIndependentReceiptVerificationStep(
  input: LiveReceiptVerificationInput,
): LiveStepResult {
  if (input.verifierOutcome === "pass" && input.receiptReference && input.partnerId && input.policyId) {
    return {
      step: "live_independent_receipt_verification",
      status: "pass",
      detail:
        `receipt_ref=${input.receiptReference} partner=${input.partnerId} policy=${input.policyId} verified_at=${input.verifiedAt ?? "unknown"} · ${input.detail}`,
    };
  }
  if (input.verifierOutcome === "fail") {
    return {
      step: "live_independent_receipt_verification",
      status: "fail",
      detail: input.detail,
    };
  }
  return {
    step: "live_independent_receipt_verification",
    status: "blocked",
    detail:
      input.detail
      || "Requires a live decision receipt from the authenticated institutional HTTP journey (holder-authorized, not local synthetic matrix), retrieved via supported interfaces, then verified with the supported independent verifier (signature, issuer, tenant, policy, expiry, revocation, replay).",
  };
}

export function liveReceiptVerificationBlockedReason(): string {
  return (
    "Manual holder action: open the hosted verification URL from Launchpad, complete permitted sandbox holder consent on /partner/verify, "
    + "then retrieve the issued receipt and public trust material and run the supported independent verifier. "
    + "Automated holder authorization is not available in CI without a permitted holder session."
  );
}
