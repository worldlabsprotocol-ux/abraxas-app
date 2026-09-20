// FILE: lib/partner/solana/contract.ts
// Solana Partner Adapter contract. Wraps the Integration Kit. No parallel verification.

import { PARTNER_INTEGRATION_GOOGLE_BOUNDARY } from "@/lib/partner/integrationKit/contract";

export const SOLANA_PARTNER_ADAPTER_VERSION = "1.0.0" as const;

export const SOLANA_PARTNER_ACTIONS = ["claim_access", "continue_checkout"] as const;
export type SolanaPartnerAction = (typeof SOLANA_PARTNER_ACTIONS)[number];

export const SOLANA_SAFE_REASON_CODES = [
  "permitted",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "environment_mismatch",
  "invalid_program",
  "invalid",
  "retry",
] as const;
export type SolanaSafeReasonCode = (typeof SOLANA_SAFE_REASON_CODES)[number];

export const SOLANA_CLIENT_VISIBLE_KEYS = ["allowed", "reason", "action"] as const;

export const SOLANA_FORBIDDEN_CLIENT_KEYS = [
  "receipt",
  "receipt_id",
  "signature",
  "signature_valid",
  "wallet",
  "wallet_address",
  "email",
  "legal_name",
  "date_of_birth",
  "dob",
  "profile",
  "claims",
  "evaluated_claim_refs",
  "jwt",
  "id_token",
] as const;

export const SOLANA_NO_FUNDS_BOUNDARY =
  "The Solana Partner Adapter never creates a transaction, mints a token, or moves funds. It binds an allow or deny result to a partner action only. It remains an eligibility gate and does not consume the portable action-contract nonce store.";

export const SOLANA_PRIVACY_CONTRACT = [
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  "Partners receive only the requested policy result: allow or deny plus a safe reason code.",
  "Identity or liveness is never the default path. A partner policy may request it only when that policy truly requires it.",
  "Browser responses must not include identity data, raw claims, receipts, signatures, wallet addresses, or user profiles.",
] as const;

export const SOLANA_VERIFICATION_REUSE =
  "Receipt verification is AbraxasPartnerKit plus GET /api/receipts/{id}/public. This adapter does not implement a second verifier.";
