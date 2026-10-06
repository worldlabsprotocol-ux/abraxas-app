// FILE: lib/partner/integrationKit/index.ts
// Re-exports canonical PartnerKit from @abraxas/partner-kit (app-local telemetry wrapper on client).

export {
  PARTNER_INTEGRATION_KIT_VERSION,
  PARTNER_INTEGRATION_NARROW_RESULT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_OUTCOMES,
  PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS,
  PARTNER_INTEGRATION_CALLBACK_KEYS,
  PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS,
  PARTNER_INTEGRATION_ERROR_CODES,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  PARTNER_INTEGRATION_SANDBOX_BEHAVIOR,
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_INTEGRATION_SOURCE_LEVEL,
  PARTNER_INTEGRATION_VERIFY_FOR_ACTION_NOTE,
  PRODUCTION_INTEGRATION_SERVER_VERIFICATION_STEPS,
  type PartnerIntegrationOutcome,
  parsePartnerCallbackParams,
  outcomeFromValidationErrors,
  resolvePolicyIntegrationCapabilities,
  validateVerificationRequestCapabilities,
  type PolicyIntegrationCapabilities,
  MemoryPartnerRequestStateStore,
  generatePartnerRequestId,
  type PartnerRequestStateStore,
  type PartnerVerificationRequestState,
  UNIVERSAL_INTEGRATION_ERROR_CATEGORIES,
  categorizeIntegrationErrors,
  embedPartnerStateInReturnUrl,
  isUniversalRequestId,
  type UniversalIntegrationErrorCategory,
  type CreateVerificationRequestInput,
  type VerificationRequestResult,
  type VerificationRequestMode,
  type VerifyCallbackWithNarrowResultInput,
  type VerifyCallbackWithNarrowResultResult,
  nextjsRouteHandlerExample,
  expressHandlerExample,
  genericTypescriptExample,
  verifyWithAbraxasExample,
  CONFORMANCE_COMMAND_EXAMPLE,
  type ResolvedApplicationPolicyBinding,
  type NarrowPartnerResult,
  type ProvenancePartnerFacts,
} from "@abraxas/partner-kit";

export {
  AbraxasPartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit/client";

export {
  verifyPartnerWebhookEvent,
  verifyWebhookThenReceipt,
} from "@abraxas/partner-kit/webhooks";
