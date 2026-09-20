// FILE: lib/partner/sandboxPartnerContract/contract.ts
// Local sandbox partner journey contract. No live holder, key issuance, or funds.

export const SANDBOX_PARTNER_CONTRACT_VERSION = "1.0.0" as const;
export const SANDBOX_PARTNER_CONTRACT_DOCS = "/docs/sandbox-conformance" as const;
export const SANDBOX_PARTNER_CONTRACT_COMMAND =
  "npx vitest run lib/partner/sandboxPartnerContract/sandboxPartnerContract.test.ts" as const;
export const SANDBOX_PARTNER_CONTRACT_NPM = "npm run test:sandbox-conformance" as const;

export const SANDBOX_PARTNER_CONTRACT_STAGES = [
  "discover",
  "create_sandbox_app",
  "configure_callback",
  "hosted_partner_flow",
  "policy_result",
  "signed_receipt",
  "server_receipt_verification",
  "webhook_recheck",
  "trading_preflight",
  "payment_preflight",
  "wallet_standard_optional",
  "sandbox_test_console",
  "production_review_request",
] as const;
export type SandboxPartnerContractStage = (typeof SANDBOX_PARTNER_CONTRACT_STAGES)[number];

export const SANDBOX_PARTNER_CONTRACT_NOTICE =
  "This local suite validates the same partner integration contract before a holder is involved. It does not issue a real receipt, verify a real person, create a production key, or move funds.";

export const SANDBOX_PARTNER_CONTRACT_DOES_NOT = [
  "Issue a live Partner Flow receipt or verify a real person.",
  "Create a production API key or activate Production.",
  "Call Circle, send a live webhook, submit a trade or payment, or move funds.",
  "Bypass tenant authorization or trust browser flags.",
] as const;
