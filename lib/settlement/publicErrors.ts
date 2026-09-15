// FILE: lib/settlement/publicErrors.ts
// Stable sanitized settlement API errors.

export const SETTLEMENT_PUBLIC_ERRORS = {
  unauthorized: "settlement_unauthorized",
  application_not_found: "settlement_application_not_found",
  config_not_found: "settlement_config_not_found",
  config_disabled: "settlement_config_disabled",
  config_paused: "settlement_config_paused",
  environment_mismatch: "settlement_environment_mismatch",
  receipt_not_found: "settlement_receipt_not_found",
  receipt_expired: "settlement_receipt_expired",
  receipt_invalid: "settlement_receipt_invalid",
  receipt_audience_mismatch: "settlement_receipt_audience_mismatch",
  receipt_policy_mismatch: "settlement_receipt_policy_mismatch",
  wallet_mismatch: "settlement_wallet_mismatch",
  amount_below_minimum: "settlement_amount_below_minimum",
  amount_above_maximum: "settlement_amount_above_maximum",
  recipient_not_allowed: "settlement_recipient_not_allowed",
  token_not_allowed: "settlement_token_not_allowed",
  authorization_not_found: "settlement_authorization_not_found",
  authorization_expired: "settlement_authorization_expired",
  authorization_reused: "settlement_authorization_reused",
  authorization_invalid: "settlement_authorization_invalid",
  signer_unavailable: "settlement_signer_unavailable",
  contract_not_configured: "settlement_contract_not_configured",
  production_unavailable: "settlement_production_unavailable",
  duplicate_confirmation: "settlement_duplicate_confirmation",
  transaction_not_confirmed: "settlement_transaction_not_confirmed",
  invalid_wallet: "settlement_invalid_wallet",
  invalid_amount: "settlement_invalid_amount",
  rate_limited: "settlement_rate_limited",
} as const;

export type SettlementPublicErrorCode =
  (typeof SETTLEMENT_PUBLIC_ERRORS)[keyof typeof SETTLEMENT_PUBLIC_ERRORS];
