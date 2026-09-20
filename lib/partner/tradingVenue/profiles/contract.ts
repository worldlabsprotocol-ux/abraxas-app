// FILE: lib/partner/tradingVenue/profiles/contract.ts
// Server-owned trading venue integration profiles. Preflight only. Not a partnership.

export const VENUE_PROFILE_REGISTRY_VERSION = "1.0.0" as const;

export const VENUE_PROFILE_IDS = [
  "generic_trading_venue",
  "hyperliquid_trading_venue",
  "solana_trading_venue",
  "evm_trading_venue",
  "disabled_trading_venue",
] as const;
export type VenueProfileId = (typeof VENUE_PROFILE_IDS)[number];

export const VENUE_PROFILE_POSTURES = [
  "sandbox_preflight",
  "production_review_required",
  "planned",
  "disabled",
] as const;
export type VenueProfilePosture = (typeof VENUE_PROFILE_POSTURES)[number];

export const VENUE_PROFILE_SAFE_REASONS = [
  "profile_unknown",
  "profile_disabled",
  "profile_planned",
  "profile_mismatch",
] as const;
export type VenueProfileSafeReason = (typeof VENUE_PROFILE_SAFE_REASONS)[number];

export const VENUE_PROFILE_CLIENT_OVERRIDE_KEYS = [
  "venue_profile_id",
  "profile_id",
  "venue",
  "exchange",
  "partner_id",
  "policy_id",
  "policy_version",
  "environment",
  "production",
  "mainnet",
  "activate_production",
  "wallet",
  "wallet_address",
  "account",
  "account_id",
  "order",
  "order_id",
  "balance",
  "position",
  "transaction",
  "tx",
  "rpc",
  "rpc_url",
  "api_key",
  "receipt",
  "receipt_id",
  "approval",
] as const;

export const VENUE_PROFILE_NEXT_STEPS = [
  "Configure sandbox through Partner Launchpad. Do not treat a browser flag as configuration.",
  "Test receipt preflight for enable_market_access with a current public receipt.",
  "Verify durable nonce handling: first permit consumes, replay denies.",
  "Build the venue’s own execution integration outside Abraxas.",
  "Request Production review. This profile never self-activates Mainnet.",
] as const;

export const VENUE_PROFILE_NO_PARTNERSHIP =
  "Named venue labels describe integration posture only. They do not imply that any venue endorses, uses, or partners with Abraxas.";

export const VENUE_PROFILE_PREFLIGHT_ONLY =
  "Abraxas provides private eligibility preflight only. The venue retains account access, wallet handling, market data, risk, orders, and execution. A webhook is never a grant. Re-fetch a current receipt before each permitted action.";

export interface VenueIntegrationProfile {
  profile_id: VenueProfileId;
  label: string;
  ecosystem: "trading_venue" | "solana" | "evm";
  posture: VenueProfilePosture;
  supported_actions: readonly ["enable_market_access"];
  supported_scopes: readonly ["sandbox:market_access"];
  policy_result_category: "eligibility";
  assurance_boundary: "current_public_receipt";
  wallet_binding: "not_attached" | "optional" | "required";
  current_receipt_required: true;
  durable_replay_required: true;
  network_id: string | null;
  docs_href: string;
  kit_path: string;
  abraxas_executes: false;
  funds_movement: false;
  connects_wallet: false;
  calls_venue_api: false;
  selectable_in_sandbox: boolean;
  future_requirements: readonly string[];
}

export const VENUE_MAINNET_EXTERNAL_REQUIREMENTS = [
  "Written venue agreement. Appearance in this registry is not a partnership or live deployment.",
  "Reviewed Production access for the Launchpad app.",
  "A venue profile whose posture is no longer sandbox_preflight or planned.",
  "Current public receipt, durable nonce/replay, and matching action/scope.",
  "Partner-owned venue execution: accounts, wallets, market data, risk, orders, and settlement stay with the venue.",
  "No Abraxas venue API, RPC, balance, position, or order path.",
] as const;
