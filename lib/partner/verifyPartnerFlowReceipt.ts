// FILE: lib/partner/verifyPartnerFlowReceipt.ts
// Canonical implementation lives in @abraxas/partner-kit/trust.

export {
  SUPPORTED_RECEIPT_SCHEMA_VERSION,
  EXPECTED_RECEIPT_ARTIFACT_TYPE,
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
  type PartnerFlowReceiptExpectations,
  type PartnerFlowReceiptValidationMode,
  type PartnerFlowReceiptValidationResult,
} from "@abraxas/partner-kit/trust";

/** @deprecated Prefer CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON from sandboxReceiptTrustContract. */
export { LEGACY_SANDBOX_ONLY_INVALIDATION_REASON as SANDBOX_ONLY_INVALIDATION_REASON } from "@abraxas/partner-kit/trust";
