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
import { PORTABLE_ACTION_NOT_EXECUTION } from "@/lib/partner/portableActionContract/contract";
import { WALLET_STANDARD_NOT_IDENTITY } from "@/lib/partner/walletStandard/contract";
import { EVM_NO_EXECUTION_BOUNDARY } from "@/lib/partner/evm/contract";
import { CHAIN_ATTESTATION_NOT_EXECUTION } from "@/lib/partner/chainAttestation/contract";

export const STARTER_KIT_VERSION = "1.9.0" as const;
export const STARTER_KIT_API_PATH = "/api/developers/integration-studio/starter-kit" as const;

export const STARTER_KIT_RUNTIMES = [
  "universal_https",
  "typescript_nextjs",
  "typescript_express",
  "javascript_wix_velo",
  "typescript_serverless",
] as const;
export type StarterKitRuntime = (typeof STARTER_KIT_RUNTIMES)[number];

export const STARTER_KIT_PLATFORMS = [
  "universal_https",
  "nextjs",
  "express",
  "wix_velo",
  "serverless",
  "solana_backend",
  "evm_contract",
  "solana_program",
] as const;
export type StarterKitPlatform = (typeof STARTER_KIT_PLATFORMS)[number];

export const STARTER_KIT_PLATFORM_TO_RUNTIME: Record<StarterKitPlatform, StarterKitRuntime> = {
  universal_https: "universal_https",
  nextjs: "typescript_nextjs",
  express: "typescript_express",
  wix_velo: "javascript_wix_velo",
  serverless: "typescript_serverless",
  solana_backend: "typescript_serverless",
  evm_contract: "typescript_serverless",
  solana_program: "typescript_serverless",
};

export const STARTER_KIT_FORBIDDEN_RUNTIMES = [
  "browser_only",
  "static",
  "static_site",
  "javascript_browser",
] as const;

export const STARTER_KIT_MINIMUM_REQUIREMENTS = [
  "An HTTPS backend or serverless function. A static or browser-only site cannot verify receipts.",
  "Server-side secret storage. Never put partner secrets, API keys, or webhook secrets in browser code.",
  "An allowlisted callback URL for Hosted Partner Flow.",
  "Server-side public-receipt verification with live currently_valid checks.",
  "Signed webhook handling that re-fetches the public receipt before any grant.",
] as const;

export const STARTER_KIT_CANONICAL_CONTRACT =
  "The universal Abraxas integration is HTTPS, hosted verification redirects, server-side receipt verification, and signed webhooks. Framework choice does not change the policy or receipt contract.";

export const STARTER_KIT_OPTIONAL_CAPABILITIES = [
  "webhooks",
  "wallet_standard_binding",
  "trading_venue",
  "payment_authorization",
  "portable_action_contract",
  "solana_gate",
  "evm_partner_adapter",
  "onchain_protocol_gate",
  "solana_onchain_eligibility_gate",
  "evm_onchain_eligibility_gate",
  "eligibility_presentation",
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
  "Does not activate Mainnet, include RPC credentials, or execute partner chain transactions.",
  "Does not treat a chain eligibility attestation as a payment, transfer, trade, token approval, or gas grant.",
  "Does not rotate partner gate signers automatically or broadcast a signer-update transaction.",
  "Does not treat an eligibility presentation as a bearer credential, passport, or automatic KYC/KYB approval.",
  "Does not call Utila, collect KYC/KYB evidence, or self-publish planning result categories.",
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
  portable: PORTABLE_ACTION_NOT_EXECUTION,
  wallet: WALLET_STANDARD_NOT_IDENTITY,
  evm: EVM_NO_EXECUTION_BOUNDARY,
  onchain: CHAIN_ATTESTATION_NOT_EXECUTION,
} as const;

export const PATH_IMPLIED_CAPABILITY: Record<IntegrationStudioPathId, string> = {
  hosted_partner_flow: "hosted_partner_flow",
  server_receipt_verify: "server_receipt_verify",
  webhook_events: "webhooks",
  solana_gate: "solana_gate",
  trading_venue: "trading_venue",
  wallet_standard_binding: "wallet_standard_binding",
  payment_authorization: "payment_authorization",
  portable_action_contract: "portable_action_contract",
  evm_partner_adapter: "evm_partner_adapter",
  onchain_protocol_gate: "onchain_protocol_gate",
  solana_onchain_eligibility_gate: "solana_onchain_eligibility_gate",
  evm_onchain_eligibility_gate: "evm_onchain_eligibility_gate",
  eligibility_presentation: "eligibility_presentation",
};

export function isStarterKitRuntime(value: string): value is StarterKitRuntime {
  return (STARTER_KIT_RUNTIMES as readonly string[]).includes(value);
}

export function isStarterKitOptionalCapability(
  value: string,
): value is StarterKitOptionalCapability {
  return (STARTER_KIT_OPTIONAL_CAPABILITIES as readonly string[]).includes(value);
}

export function isStarterKitPlatform(value: string): value is StarterKitPlatform {
  return (STARTER_KIT_PLATFORMS as readonly string[]).includes(value);
}

export const STARTER_KIT_ALLOWED_INPUT_KEYS = [
  "pack_id",
  "path",
  "runtime",
  "platform",
  "capabilities",
] as const;

export const STARTER_KIT_PATHS = INTEGRATION_STUDIO_PATHS;

export const STARTER_KIT_PLATFORM_MATRIX = [
  {
    id: "universal_https",
    label: "Universal HTTPS",
    runtime: "universal_https",
    canonical: true,
    works: ["hosted_partner_flow", "server_receipt_verify", "webhook_events", "trading_venue", "payment_authorization", "portable_action_contract", "wallet_standard_binding", "solana_gate", "evm_partner_adapter", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "evm_onchain_eligibility_gate", "eligibility_presentation"],
    note: "Any product with an HTTPS backend. Canonical integration.",
  },
  {
    id: "nextjs",
    label: "Next.js",
    runtime: "typescript_nextjs",
    canonical: false,
    works: ["hosted_partner_flow", "server_receipt_verify", "webhook_events", "trading_venue", "payment_authorization", "portable_action_contract", "wallet_standard_binding", "solana_gate", "evm_partner_adapter", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "evm_onchain_eligibility_gate", "eligibility_presentation"],
    note: "App Router server routes. Secrets stay in the server runtime.",
  },
  {
    id: "express",
    label: "Express / Node",
    runtime: "typescript_express",
    canonical: false,
    works: ["hosted_partner_flow", "server_receipt_verify", "webhook_events", "trading_venue", "payment_authorization", "portable_action_contract", "wallet_standard_binding", "solana_gate", "evm_partner_adapter", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "evm_onchain_eligibility_gate", "eligibility_presentation"],
    note: "Node HTTP server using the same Partner Kit contracts.",
  },
  {
    id: "wix_velo",
    label: "Wix Velo",
    runtime: "javascript_wix_velo",
    canonical: false,
    works: ["hosted_partner_flow", "server_receipt_verify", "webhook_events", "trading_venue", "payment_authorization", "portable_action_contract", "wallet_standard_binding", "evm_partner_adapter", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "evm_onchain_eligibility_gate", "eligibility_presentation"],
    note: "Good Trouble-style Wix backend. Secrets Manager names only. Frontend calls backend only.",
  },
  {
    id: "serverless",
    label: "Serverless function",
    runtime: "typescript_serverless",
    canonical: false,
    works: ["hosted_partner_flow", "server_receipt_verify", "webhook_events", "trading_venue", "payment_authorization", "portable_action_contract", "wallet_standard_binding", "solana_gate", "evm_partner_adapter", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "evm_onchain_eligibility_gate", "eligibility_presentation"],
    note: "Vercel Functions, Cloudflare Workers, or Netlify Functions with small host substitutions.",
  },
  {
    id: "solana_backend",
    label: "Solana partner backend",
    runtime: "typescript_serverless",
    canonical: false,
    works: ["solana_gate", "hosted_partner_flow", "server_receipt_verify", "webhook_events", "onchain_protocol_gate", "solana_onchain_eligibility_gate", "eligibility_presentation"],
    note: "HTTPS partner backend plus the Solana eligibility gate. No on-chain personal data.",
  },
  {
    id: "evm_contract",
    label: "EVM contract integration",
    runtime: "typescript_serverless",
    canonical: false,
    works: ["onchain_protocol_gate", "evm_onchain_eligibility_gate", "evm_partner_adapter", "hosted_partner_flow", "server_receipt_verify", "eligibility_presentation"],
    note: "Partner-owned EIP-712 gate. Local Foundry tests only. Abraxas does not deploy a shared contract.",
  },
  {
    id: "solana_program",
    label: "Solana program integration",
    runtime: "typescript_serverless",
    canonical: false,
    works: ["onchain_protocol_gate", "solana_onchain_eligibility_gate", "solana_gate", "hosted_partner_flow", "server_receipt_verify", "eligibility_presentation"],
    note: "Local/reference Anchor gate plus Ed25519 helpers. No live deployment or RPC.",
  },
] as const;

export function starterKitPublicCatalog() {
  return {
    version: STARTER_KIT_VERSION,
    canonical_contract: STARTER_KIT_CANONICAL_CONTRACT,
    minimum_requirements: [...STARTER_KIT_MINIMUM_REQUIREMENTS],
    runtimes: [...STARTER_KIT_RUNTIMES],
    platforms: STARTER_KIT_PLATFORM_MATRIX,
    optional_capabilities: [...STARTER_KIT_OPTIONAL_CAPABILITIES],
    placeholders_only: true,
    issues_credentials: false,
    issues_receipts: false,
    moves_funds: false,
    browser_only_supported: false,
    does_not_do: STARTER_KIT_DOES_NOT_DO,
  };
}
