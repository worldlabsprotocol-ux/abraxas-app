// FILE: lib/settlement/circle/constants.ts
// DEMO / Arc testnet settlement infrastructure. Not a customer-funds custodian.
// Paths and enums match Circle developer-controlled wallets OpenAPI.

export const CIRCLE_NETWORK = "ARC-TESTNET" as const;
export const CIRCLE_CURRENCY = "USDC" as const;
export const CIRCLE_USDC_DECIMALS = 6;
export const ARC_TESTNET_USDC_TOKEN_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const CIRCLE_API_BASE_URL = "https://api.circle.com";
export const CIRCLE_ENTITY_PUBLIC_KEY_PATH = "/v1/w3s/config/entity/publicKey";
export const CIRCLE_WALLET_PATH = "/v1/w3s/wallets";
export const CIRCLE_TRANSFER_PATH = "/v1/w3s/developer/transactions/transfer";
export const CIRCLE_TRANSACTION_PATH = "/v1/w3s/transactions";

/** Official Circle TransactionState enum. Do not invent extra states. */
export const CIRCLE_OFFICIAL_TRANSACTION_STATES = [
  "INITIATED",
  "CLEARED",
  "QUEUED",
  "SENT",
  "STUCK",
  "CONFIRMED",
  "COMPLETE",
  "FAILED",
  "DENIED",
  "CANCELLED",
] as const;

export type CircleProviderState = (typeof CIRCLE_OFFICIAL_TRANSACTION_STATES)[number];

/** Official Circle terminal states from the transfer tutorial poll loop. */
export const CIRCLE_TERMINAL_TRANSACTION_STATES = [
  "COMPLETE",
  "FAILED",
  "CANCELLED",
  "DENIED",
] as const;

export type CircleTerminalProviderState = (typeof CIRCLE_TERMINAL_TRANSACTION_STATES)[number];

export const CIRCLE_INFRASTRUCTURE_LABEL =
  "DEMO/testnet settlement wallet — test infrastructure only" as const;
export const CIRCLE_FEATURE = "circle_arc_testnet_settlement" as const;
export const CIRCLE_SETTLEMENT_ARTIFACT = "abraxas_circle_settlement_manifest" as const;
export const CIRCLE_SETTLEMENT_SCHEMA_VERSION = "1.0.0" as const;
export const CIRCLE_SETTLEMENT_LABEL = "sandbox/testnet" as const;

/** 0.01 USDC in minor units. Demo transfers stay small. */
export const CIRCLE_DEMO_AMOUNT_MINOR = 10_000;
/** Hard cap: 1 USDC. Prevents accidental large testnet moves. */
export const CIRCLE_DEMO_AMOUNT_MINOR_MAX = 1_000_000;

export const CIRCLE_INTENT_STATES = [
  "pending",
  "submitted",
  "settled",
  "failed",
  "cancelled",
] as const;

export type CircleIntentState = (typeof CIRCLE_INTENT_STATES)[number];

export const CIRCLE_TERMINAL_INTENT_STATES = ["settled", "failed", "cancelled"] as const;

export type CircleTerminalIntentState = (typeof CIRCLE_TERMINAL_INTENT_STATES)[number];

export const CIRCLE_SCHEMA_TABLE = "partner_settlement_intents" as const;

/** Explicit opt-in. Local/staging/production stay blocked without this. */
export const CIRCLE_ARC_TESTNET_ENABLE_ENV = "CIRCLE_ARC_TESTNET_ENABLED" as const;
