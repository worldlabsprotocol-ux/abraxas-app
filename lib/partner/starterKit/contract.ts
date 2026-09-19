// FILE: lib/partner/starterKit/contract.ts
// Integration Studio starter-kit generator. Placeholders only. No live credentials.

import {
  INTEGRATION_STUDIO_GOOGLE,
  INTEGRATION_STUDIO_PATHS,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { SOLANA_NO_FUNDS_BOUNDARY } from "@/lib/partner/solana/contract";
import { TRADING_VENUE_NO_FUNDS_BOUNDARY } from "@/lib/partner/tradingVenue/contract";
import { PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY } from "@/lib/partner/paymentAuthorization/contract";
import { WALLET_STANDARD_NOT_IDENTITY } from "@/lib/partner/walletStandard/contract";

export const STARTER_KIT_VERSION = "1.0.0" as const;
export const STARTER_KIT_API_PATH = "/api/developers/integration-studio/starter-kit" as const;

export const STARTER_KIT_RUNTIMES = ["typescript_nextjs", "typescript_express"] as const;
export type StarterKitRuntime = (typeof STARTER_KIT_RUNTIMES)[number];

export const STARTER_KIT_OPTIONAL_CAPABILITIES = [
  "webhooks",
  "wallet_standard_binding",
  "trading_venue",
  "payment_authorization",
  "solana_gate",
] as const;
export type StarterKitOptionalCapability = (typeof STARTER_KIT_OPTIONAL_CAPABILITIES)[number];

export const STARTER_KIT_PLACEHOLDERS = {
  partner_id: "YOUR_PARTNER_ID",
  policy_id: "YOUR_POLICY_ID",
  policy_version: "YOUR_POLICY_VERSION",
  app_id: "YOUR_APP_ID",
  api_key: "YOUR_SANDBOX_API_KEY",
  callback_url: "YOUR_CALLBACK_URL",
  webhook_secret: "YOUR_WEBHOOK_SECRET",
} as const;

export const STARTER_KIT_DOES_NOT_DO = [
  "Does not custody funds, cards, wallets, or tokens.",
  "Does not issue Production access or live API keys.",
  "Does not replace policy review or a written partner agreement.",
  "Does not treat browser flags, callback query keys, or webhook bodies as grants.",
  "Does not charge, capture, transfer, settle, or call Circle.",
  "Does not sign a blockchain transaction or bind a wallet as identity.",
] as const;

export const STARTER_KIT_REJECTED_CAPABILITIES = [
  "circle",
  "circle_settlement",
  "confirm_testnet_transfer",
  "production",
  "custody",
  "exchange",
  "token",
] as const;

export const STARTER_KIT_NOTICES = {
  google: INTEGRATION_STUDIO_GOOGLE,
  webhook: PARTNER_EVENT_NOT_AUTHORIZATION,
  solana: SOLANA_NO_FUNDS_BOUNDARY,
  venue: TRADING_VENUE_NO_FUNDS_BOUNDARY,
  payment: PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  wallet: WALLET_STANDARD_NOT_IDENTITY,
} as const;

export const PATH_IMPLIED_CAPABILITY: Record<IntegrationStudioPathId, string> = {
  hosted_partner_flow: "hosted_partner_flow",
  server_receipt_verify: "server_receipt_verify",
  webhook_events: "webhooks",
  solana_gate: "solana_gate",
  trading_venue: "trading_venue",
  wallet_standard_binding: "wallet_standard_binding",
  payment_authorization: "payment_authorization",
};

export function isStarterKitRuntime(value: string): value is StarterKitRuntime {
  return (STARTER_KIT_RUNTIMES as readonly string[]).includes(value);
}

export function isStarterKitOptionalCapability(
  value: string,
): value is StarterKitOptionalCapability {
  return (STARTER_KIT_OPTIONAL_CAPABILITIES as readonly string[]).includes(value);
}

export const STARTER_KIT_ALLOWED_INPUT_KEYS = [
  "pack_id",
  "path",
  "runtime",
  "capabilities",
] as const;

export const STARTER_KIT_PATHS = INTEGRATION_STUDIO_PATHS;

export function starterKitPublicCatalog() {
  return {
    version: STARTER_KIT_VERSION,
    runtimes: [...STARTER_KIT_RUNTIMES],
    optional_capabilities: [...STARTER_KIT_OPTIONAL_CAPABILITIES],
    placeholders_only: true,
    issues_credentials: false,
    issues_receipts: false,
    moves_funds: false,
    does_not_do: STARTER_KIT_DOES_NOT_DO,
  };
}
