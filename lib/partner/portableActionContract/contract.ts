// FILE: lib/partner/portableActionContract/contract.ts
// Canonical server-side partner action contract. Preflight only. Never executes.

import { PARTNER_INTEGRATION_GOOGLE_BOUNDARY } from "@/lib/partner/integrationKit/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { SOLANA_NO_FUNDS_BOUNDARY } from "@/lib/partner/solana/contract";
import { WALLET_STANDARD_BINDING_MODES, type WalletStandardBindingMode } from "@/lib/partner/walletStandard/contract";
import type { NetworkContext } from "@/lib/partner/networkCapability/types";

export const PORTABLE_ACTION_CONTRACT_VERSION = "1.0.0" as const;
export const PORTABLE_ACTION_RECEIPT_REQUIREMENT = "current_public_receipt" as const;

export const PORTABLE_ACTION_TYPES = [
  "enable_market_access",
  "authorize_checkout",
  "authorize_recurring_payment",
  "grant_membership_access",
  "partner_protocol_action",
] as const;
export type PortableActionType = (typeof PORTABLE_ACTION_TYPES)[number];

export const PORTABLE_ACTION_SCOPES = [
  "sandbox:market_access",
  "sandbox:checkout",
  "sandbox:recurring_payment",
  "sandbox:membership_access",
  "sandbox:partner_protocol",
] as const;
export type PortableActionScope = (typeof PORTABLE_ACTION_SCOPES)[number];

export const PORTABLE_ACTION_TYPE_SCOPES: Record<PortableActionType, PortableActionScope> = {
  enable_market_access: "sandbox:market_access",
  authorize_checkout: "sandbox:checkout",
  authorize_recurring_payment: "sandbox:recurring_payment",
  grant_membership_access: "sandbox:membership_access",
  partner_protocol_action: "sandbox:partner_protocol",
};

export const PORTABLE_ACTION_WALLET_BINDING_MODES = WALLET_STANDARD_BINDING_MODES;
export type PortableActionWalletBindingMode = WalletStandardBindingMode;

export const PORTABLE_ACTION_ENVIRONMENTS = ["sandbox", "production"] as const;
export type PortableActionEnvironment = (typeof PORTABLE_ACTION_ENVIRONMENTS)[number];

export const PORTABLE_ACTION_SAFE_REASON_CODES = [
  "permitted",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "environment_mismatch",
  "action_mismatch",
  "action_expired",
  "replayed",
  "wallet_binding_missing",
  "wallet_binding_expired",
  "wallet_binding_mismatch",
  "wallet_binding_replayed",
  "wallet_binding_cross_partner",
  "store_unavailable",
  "invalid",
  "retry",
] as const;
export type PortableActionSafeReasonCode = (typeof PORTABLE_ACTION_SAFE_REASON_CODES)[number];

export const PORTABLE_ACTION_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at",
] as const;

export const PORTABLE_ACTION_CONTRACT_KEYS = [
  "partner_id",
  "policy_id",
  "policy_version",
  "action_type",
  "action_scope",
  "receipt_requirement",
  "issued_at",
  "expires_at",
  "nonce",
  "wallet_binding",
  "environment",
  "network_context",
] as const;

export const PORTABLE_ACTION_REJECTED_CONTRACT_KEYS = [
  "activate_production",
  "issue_production_key",
  "production_key",
  "from_browser",
  "client_issued",
  "webhook_body",
  "callback",
  "network_id",
  "chain_id",
  "rpc",
  "rpc_url",
  "wallet_address",
  "transaction",
  "tx",
  "execute",
  "execution",
  "provider",
] as const;

export const PORTABLE_ACTION_FORBIDDEN_KEYS = [
  "policy_id",
  "policy_version",
  "partner_id",
  "environment",
  "receipt",
  "receipt_id",
  "activate_production",
  "issue_production_key",
  "network_id",
  "chain_id",
  "rpc_url",
] as const;

export const PORTABLE_ACTION_NOT_EXECUTION =
  "Allowed means the partner may perform its own named action. Abraxas never executes the trade, payment, membership grant, wallet connection, or protocol call.";

export const PORTABLE_ACTION_BOUNDARY =
  "Abraxas remains the private eligibility and authorization layer. It is not an exchange, broker, custodian, wallet, payment processor, order router, token issuer, or execution engine.";

export const PORTABLE_ACTION_WEBHOOK_NOTICE = PARTNER_EVENT_NOT_AUTHORIZATION;

export const PORTABLE_ACTION_PRIVACY_CONTRACT = [
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  SOLANA_NO_FUNDS_BOUNDARY,
  PORTABLE_ACTION_NOT_EXECUTION,
  "Partners receive only allow or deny, a safe reason code, action binding, and expiry.",
] as const;

export interface PortableActionContract {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  action_type: PortableActionType;
  action_scope: PortableActionScope;
  receipt_requirement: typeof PORTABLE_ACTION_RECEIPT_REQUIREMENT;
  issued_at: string;
  expires_at: string;
  nonce: string;
  wallet_binding: PortableActionWalletBindingMode;
  environment: PortableActionEnvironment;
  network_context?: NetworkContext;
}

export interface PortableActionBinding {
  action_type: PortableActionType | "rejected";
  action_scope: string;
  nonce_state: "issued" | "consumed" | "replayed" | "rejected";
  wallet_binding: "not_attached" | "optional" | "required" | "bound" | "missing" | "expired" | "mismatched" | "replayed" | "cross_partner";
}

export interface PortableActionClientResult {
  allowed: boolean;
  reason: PortableActionSafeReasonCode;
  action_binding: PortableActionBinding;
  expires_at: string | null;
}

export function isPortableActionType(value: string): value is PortableActionType {
  return (PORTABLE_ACTION_TYPES as readonly string[]).includes(value);
}

export function isPortableActionScope(value: string): value is PortableActionScope {
  return (PORTABLE_ACTION_SCOPES as readonly string[]).includes(value);
}

export function isPortableWalletBindingMode(value: string): value is PortableActionWalletBindingMode {
  return (PORTABLE_ACTION_WALLET_BINDING_MODES as readonly string[]).includes(value);
}

export function isPortableEnvironment(value: string): value is PortableActionEnvironment {
  return (PORTABLE_ACTION_ENVIRONMENTS as readonly string[]).includes(value);
}
