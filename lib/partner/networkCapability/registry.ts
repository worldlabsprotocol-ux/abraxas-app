// FILE: lib/partner/networkCapability/registry.ts
// Accurate Mainnet posture. Planned/testnet never silently becomes Mainnet.

import type { NetworkCapabilityEntry } from "./types";
import { NETWORK_RECEIPT_REQUIREMENT, NETWORK_REPLAY_REQUIREMENT } from "./types";

const BASE = {
  receipt_requirement: NETWORK_RECEIPT_REQUIREMENT,
  replay_requirement: NETWORK_REPLAY_REQUIREMENT,
  abraxas_executes: false as const,
  funds_movement: false as const,
};

export const NETWORK_CAPABILITY_REGISTRY: readonly NetworkCapabilityEntry[] = [
  {
    ...BASE,
    network_id: "arc_circle_testnet",
    ecosystem: "arc_circle",
    environment: "testnet",
    status: "configured",
    supported_actions: ["authorize_checkout", "partner_protocol_action"],
    wallet_binding: "not_attached",
    display_label: "Arc / Circle testnet (explicit confirmation)",
    docs_href: "/docs/circle-arc-testnet",
    posture:
      "Existing sandbox/testnet settlement path with explicit confirmation only. Not Mainnet. Abraxas never submits a transfer without that separate confirm step.",
  },
  {
    ...BASE,
    network_id: "arc_circle_mainnet",
    ecosystem: "arc_circle",
    environment: "mainnet",
    status: "disabled",
    supported_actions: ["authorize_checkout", "partner_protocol_action"],
    wallet_binding: "not_attached",
    display_label: "Arc / Circle Mainnet",
    docs_href: "/docs/multichain-mainnet-readiness",
    posture:
      "Disabled until configured. Production review is required. Not available and not live.",
  },
  {
    ...BASE,
    network_id: "solana_devnet",
    ecosystem: "solana",
    environment: "testnet",
    status: "configured",
    supported_actions: ["partner_protocol_action"],
    wallet_binding: "optional",
    display_label: "Solana devnet eligibility gate",
    docs_href: "/docs/solana",
    posture:
      "No-funds eligibility gate using the existing Solana partner adapter. Never creates a transaction or moves funds.",
  },
  {
    ...BASE,
    network_id: "solana_mainnet",
    ecosystem: "solana",
    environment: "mainnet",
    status: "production_review_required",
    supported_actions: ["partner_protocol_action"],
    wallet_binding: "optional",
    display_label: "Solana Mainnet eligibility gate",
    docs_href: "/docs/solana",
    posture:
      "No-funds eligibility-gate posture only. Mainnet partner use stays on the reviewed Production-access path. Not a live executor.",
  },
  {
    ...BASE,
    network_id: "evm_sandbox",
    ecosystem: "evm",
    environment: "sandbox",
    status: "configured",
    supported_actions: ["enable_protocol_access", "enable_member_access", "enable_redemption_access"],
    wallet_binding: "unsupported",
    display_label: "EVM partner eligibility (sandbox)",
    docs_href: "/docs/evm-partner-adapter",
    posture:
      "Preflight-only eligibility for named protocol, member, and redemption access. The partner backend retains node access, signer, contract, gas, and execution. Not a live chain.",
  },
  {
    ...BASE,
    network_id: "evm_mainnet",
    ecosystem: "evm",
    environment: "mainnet",
    status: "production_review_required",
    supported_actions: ["enable_protocol_access", "enable_member_access", "enable_redemption_access"],
    wallet_binding: "unsupported",
    display_label: "EVM Mainnet eligibility gate",
    docs_href: "/docs/evm-partner-adapter",
    posture:
      "Adapter exists. Unavailable until reviewed Production access, a supported named action, a current receipt, durable replay, and a partner-owned EVM execution integration exist. Not a live chain, wallet, protocol, or Mainnet deployment.",
  },
  {
    ...BASE,
    network_id: "hyperliquid_trading_venue",
    ecosystem: "trading_venue",
    environment: "sandbox",
    status: "configured",
    supported_actions: ["enable_market_access"],
    wallet_binding: "optional",
    display_label: "Trading venue preflight (Hyperliquid-class)",
    docs_href: "/docs/trading-venue",
    posture:
      "Partner-preflight only. Venue-neutral. Never places an order, routes, or moves funds. Does not imply a Hyperliquid partnership.",
  },
];

export function getNetworkCapability(networkId: string | null | undefined): NetworkCapabilityEntry | null {
  if (!networkId || typeof networkId !== "string") return null;
  return NETWORK_CAPABILITY_REGISTRY.find((entry) => entry.network_id === networkId) ?? null;
}

export function publicNetworkMatrix(): Array<{
  network_id: string;
  ecosystem: NetworkCapabilityEntry["ecosystem"];
  environment: NetworkCapabilityEntry["environment"];
  status: NetworkCapabilityEntry["status"];
  display_label: string;
  docs_href: string;
  posture: string;
  abraxas_executes: false;
  live: false;
}> {
  return NETWORK_CAPABILITY_REGISTRY.map((entry) => ({
    network_id: entry.network_id,
    ecosystem: entry.ecosystem,
    environment: entry.environment,
    status: entry.status,
    display_label: entry.display_label,
    docs_href: entry.docs_href,
    posture: entry.posture,
    abraxas_executes: false as const,
    live: false as const,
  }));
}
