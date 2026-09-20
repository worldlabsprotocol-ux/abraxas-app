// FILE: lib/partner/networkCapability/types.ts
// Dependency-neutral network capability model. Server-owned. Never executes.

export const NETWORK_CAPABILITY_VERSION = "1.0.0" as const;

export const NETWORK_ECOSYSTEMS = ["arc_circle", "solana", "evm", "trading_venue"] as const;
export type NetworkEcosystem = (typeof NETWORK_ECOSYSTEMS)[number];

export const NETWORK_ENVIRONMENTS = ["sandbox", "testnet", "mainnet", "planned"] as const;
export type NetworkEnvironment = (typeof NETWORK_ENVIRONMENTS)[number];

export const NETWORK_STATUSES = [
  "available",
  "configured",
  "production_review_required",
  "disabled",
  "planned",
] as const;
export type NetworkStatus = (typeof NETWORK_STATUSES)[number];

export const NETWORK_WALLET_BINDING_MODES = [
  "not_attached",
  "optional",
  "required",
  "unsupported",
] as const;
export type NetworkWalletBindingMode = (typeof NETWORK_WALLET_BINDING_MODES)[number];

export const NETWORK_RECEIPT_REQUIREMENT = "current_public_receipt" as const;
export const NETWORK_REPLAY_REQUIREMENT = "durable_nonce" as const;

export type NetworkReadinessReason =
  | "eligible"
  | "planned"
  | "disabled"
  | "not_configured"
  | "production_review_required"
  | "unsupported_action"
  | "environment_mismatch"
  | "receipt_not_current"
  | "replay_required"
  | "partner_execution_required"
  | "client_override_rejected";

export interface NetworkCapabilityEntry {
  network_id: string;
  ecosystem: NetworkEcosystem;
  environment: NetworkEnvironment;
  status: NetworkStatus;
  supported_actions: readonly string[];
  wallet_binding: NetworkWalletBindingMode;
  receipt_requirement: typeof NETWORK_RECEIPT_REQUIREMENT;
  replay_requirement: typeof NETWORK_REPLAY_REQUIREMENT;
  abraxas_executes: false;
  funds_movement: false;
  display_label: string;
  docs_href: string;
  posture: string;
}

export interface NetworkContext {
  network_id: string;
  environment: NetworkEnvironment;
}

export const NETWORK_CAPABILITY_NOTICE =
  "Abraxas verifies policy-bound results and preflights one named partner action. Partners run their own chain or venue execution. Appearance in this registry is not a live Mainnet, custody, exchange, or transfer capability.";

export const NETWORK_CLIENT_OVERRIDE_KEYS = [
  "network_id",
  "chain_id",
  "rpc",
  "rpc_url",
  "wallet",
  "wallet_address",
  "wallet_id",
  "transaction",
  "tx",
  "execute",
  "execution",
  "provider",
  "api_key",
  "entity_secret",
  "activate_production",
  "issue_production_key",
  "production",
  "mainnet",
] as const;
