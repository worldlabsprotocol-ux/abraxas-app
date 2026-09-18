// FILE: lib/partner/integrationKit/index.ts
// Official Partner Integration Kit entry.

export {
  PARTNER_INTEGRATION_KIT_VERSION,
  PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_OUTCOMES,
  PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS,
  PARTNER_INTEGRATION_CALLBACK_KEYS,
  PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS,
  PARTNER_INTEGRATION_ERROR_CODES,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  PARTNER_INTEGRATION_SANDBOX_BEHAVIOR,
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  type PartnerIntegrationOutcome,
} from "@/lib/partner/integrationKit/contract";

export { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
export { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
export {
  AbraxasPartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit/client";
export {
  nextjsRouteHandlerExample,
  expressHandlerExample,
  genericTypescriptExample,
  CONFORMANCE_COMMAND_EXAMPLE,
} from "@/lib/partner/integrationKit/examples";
