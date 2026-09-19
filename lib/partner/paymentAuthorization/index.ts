// FILE: lib/partner/paymentAuthorization/index.ts
// Public Payment Authorization Adapter entry.

export {
  PAYMENT_AUTHORIZATION_ADAPTER_VERSION,
  PAYMENT_AUTHORIZATION_ACTION_TYPES,
  PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE,
  PAYMENT_AUTHORIZATION_RECURRING_SCOPE,
  PAYMENT_AUTHORIZATION_ALLOWED_SCOPES,
  PAYMENT_AUTHORIZATION_TYPE_SCOPES,
  PAYMENT_AUTHORIZATION_SAFE_REASON_CODES,
  PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS,
  PAYMENT_AUTHORIZATION_FORBIDDEN_CLIENT_KEYS,
  PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION,
  PAYMENT_AUTHORIZATION_PRIVACY_CONTRACT,
  PAYMENT_AUTHORIZATION_VERIFICATION_REUSE,
  PAYMENT_AUTHORIZATION_FLOW,
  PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS,
  type PaymentAuthorizationActionType,
  type PaymentAuthorizationActionScope,
  type PaymentAuthorizationSafeReasonCode,
  type PaymentAuthorizationActionContract,
  type PaymentAuthorizationActionBinding,
} from "@/lib/partner/paymentAuthorization/contract";

export {
  AbraxasPaymentAuthorizationAdapter,
  isPaymentActionType,
  isPaymentActionScope,
  type AbraxasPaymentAuthorizationAdapterOptions,
} from "@/lib/partner/paymentAuthorization/adapter";

export {
  toClientVisiblePaymentResult,
  paymentReasonFromOutcome,
  assertNoSensitivePaymentClientKeys,
  type PaymentAuthorizationClientVisibleResult,
} from "@/lib/partner/paymentAuthorization/clientVisible";

export {
  PAYMENT_REF_PARTNER_ID,
  PAYMENT_REF_POLICY_ID,
  paymentFixtureReceipt,
  isPaymentFixtureId,
  type PaymentFixtureId,
} from "@/lib/partner/paymentAuthorization/fixtures";

export {
  paymentAuthorizationServerExample,
  PAYMENT_AUTHORIZATION_ARCHITECTURE_DIAGRAM,
} from "@/lib/partner/paymentAuthorization/examples";
