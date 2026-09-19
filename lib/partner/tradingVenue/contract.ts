// FILE: lib/partner/tradingVenue/contract.ts
// Venue-neutral Trading Venue Adapter. Policy and receipt layer only. Not an exchange.

import { PARTNER_INTEGRATION_GOOGLE_BOUNDARY } from "@/lib/partner/integrationKit/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { SOLANA_NO_FUNDS_BOUNDARY } from "@/lib/partner/solana/contract";

export const TRADING_VENUE_ADAPTER_VERSION = "1.0.0" as const;

export const TRADING_VENUE_ACTION_TYPES = ["enable_market_access"] as const;
export type TradingVenueActionType = (typeof TRADING_VENUE_ACTION_TYPES)[number];

export const TRADING_VENUE_SANDBOX_SCOPE = "sandbox:market_access" as const;
export const TRADING_VENUE_ALLOWED_SCOPES = [TRADING_VENUE_SANDBOX_SCOPE] as const;
export type TradingVenueActionScope = (typeof TRADING_VENUE_ALLOWED_SCOPES)[number];

export const TRADING_VENUE_SAFE_REASON_CODES = [
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
  "invalid",
  "retry",
] as const;
export type TradingVenueSafeReasonCode = (typeof TRADING_VENUE_SAFE_REASON_CODES)[number];

export const TRADING_VENUE_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at",
] as const;

export const TRADING_VENUE_FORBIDDEN_CLIENT_KEYS = [
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
  "fills",
  "orders",
  "positions",
  "trading_history",
] as const;

export const TRADING_VENUE_NOT_A_MARKET =
  "Abraxas is the private policy and receipt layer for venues people already use. It is not an exchange, broker, custodian, wallet, trading bot, token issuer, order router, or copy-trading product.";

export const TRADING_VENUE_NO_FUNDS_BOUNDARY =
  "The Trading Venue Adapter never creates a trade, submits an order, opens a wallet, mints a token, or moves funds. It answers whether one named action may proceed.";

export const TRADING_VENUE_NO_VENUE_PARTNERSHIP =
  "This adapter is venue-neutral. It does not imply a partnership with any named exchange, wallet, or router.";

export const TRADING_VENUE_WALLET_BINDING_MODES = ["not_attached", "optional", "required"] as const;
export type TradingVenueWalletBindingMode = (typeof TRADING_VENUE_WALLET_BINDING_MODES)[number];

export const TRADING_VENUE_WALLET_BINDING_STATES = [
  "not_attached",
  "optional",
  "required",
  "bound",
  "missing",
  "expired",
  "mismatched",
  "replayed",
  "cross_partner",
] as const;
export type TradingVenueWalletBindingState = (typeof TRADING_VENUE_WALLET_BINDING_STATES)[number];

export const TRADING_VENUE_WALLET_BINDING_FUTURE = {
  status: "not_attached" as const,
  implemented: true as const,
  attach_later:
    "Wallet Standard signMessage may attach an opaque binding_ref to action_binding without changing receipt verification or policy semantics.",
};

export const TRADING_VENUE_PRIVACY_CONTRACT = [
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  SOLANA_NO_FUNDS_BOUNDARY,
  "Partners receive only allow or deny, a safe reason code, action binding, and expiry.",
  "Browser responses must not include receipts, signatures, claims, PII, wallet addresses, trading history, or provider payloads.",
] as const;

export const TRADING_VENUE_VERIFICATION_REUSE =
  "Receipt verification is AbraxasPartnerKit plus GET /api/receipts/{id}/public. This adapter does not implement a second verifier.";

export const TRADING_VENUE_FLOW =
  "Policy pack → hosted Partner Flow → minimum approved receipt → venue preflight → lifecycle or webhook re-check. A webhook body is never a grant.";

export interface TradingVenueActionContract {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  action_type: TradingVenueActionType;
  action_scope: TradingVenueActionScope;
  expires_at: string;
  nonce: string;
  wallet_binding: TradingVenueWalletBindingMode;
}

export interface TradingVenueActionBinding {
  action_type: TradingVenueActionType | "rejected";
  action_scope: string;
  nonce_state: "issued" | "consumed" | "replayed" | "rejected";
  wallet_binding: TradingVenueWalletBindingState;
}

export const TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS = [
  "The venue remains the execution system. Abraxas only answers a preflight for one named action.",
  "Production access stays on the reviewed Launchpad upgrade path. No self-serve live keys from this adapter.",
  "Pin partner_id, policy_id, and policy_version. Fail closed on draft, deprecated, missing, or mismatched versions.",
  "Issue a server-authoritative action contract (type, narrow scope, expiry, one-time nonce) before each grant.",
  "Verify the current public receipt on the server. Do not trust callbacks, webhooks, or client flags.",
  "Consume the nonce on the first permitted preflight. Replay the same nonce as deny.",
  "Return only allow or deny, a safe reason, action binding, and expiry. Never return receipt material.",
  "Wallet binding stays optional unless the venue sets required. Do not collect private keys or expose wallet addresses.",
  "Do not submit orders, route liquidity, custody assets, or connect to a live exchange from Abraxas.",
  "Name no implied venue partnership in product copy. Integrate only after a written venue agreement and production review.",
] as const;
