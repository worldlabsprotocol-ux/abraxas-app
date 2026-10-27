// FILE: lib/developers/mapGuidedProgressRestore.ts

import type { EphemeralSandboxGuidedProgress } from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";
import type { ReceiptValidationUiState } from "@/lib/developers/mapReceiptValidationOutcome";

export function mapGuidedProgressReceiptValidation(
  validation: EphemeralSandboxGuidedProgress["receipt_validation"],
): ReceiptValidationUiState {
  if (!validation) return { status: "idle" };
  if (validation.status === "failed") {
    return {
      status: "failed",
      title: "Receipt check failed",
      message: "The saved validation outcome could not be accepted.",
      recovery: "Validate again from your receipt copy.",
      technicalCode: "guided_progress_validation_failed",
    };
  }
  return {
    status: "validated",
    checkedAt: validation.checked_at,
    signatureAuthentic: validation.signature_authentic,
    currentlyAcceptable: validation.currently_acceptable,
    invalidationReasons: validation.invalidation_reasons,
    standaloneCryptographicVerification: validation.standalone_cryptographic_verification,
    verificationSummary: validation.verification_summary ?? undefined,
  };
}
