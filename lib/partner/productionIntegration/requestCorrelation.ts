// FILE: lib/partner/productionIntegration/requestCorrelation.ts
// Canonical implementation in @abraxas/partner-kit; re-exported for app compatibility.

export {
  PARTNER_REQUEST_ID_PREFIX,
  PARTNER_VERIFY_REQUEST_PREFIX,
  isOpaqueVerifyRequest,
  resetPartnerRequestCorrelationForTests,
  issuePartnerRequestCorrelation,
  validatePartnerRequestCorrelation,
  embedRequestIdInReturnUrl,
  extractRequestIdFromReturnUrl,
  correlationFingerprint,
  type PartnerRequestCorrelationBinding,
} from "@abraxas/partner-kit";
