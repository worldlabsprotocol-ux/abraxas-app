// FILE: lib/partner/tradingVenue/profiles/registry.ts
// Dependency-neutral venue profile registry. Browser data never creates rules.

import {
  VENUE_PROFILE_IDS,
  VENUE_PROFILE_NO_PARTNERSHIP,
  type VenueIntegrationProfile,
  type VenueProfileId,
} from "./contract";

const ENABLE = ["enable_market_access"] as const;
const SCOPE = ["sandbox:market_access"] as const;
const FUTURE_SOLANA = [
  "A Solana trading venue profile stays planned until a reviewed Production path, current receipt, durable replay, and a partner-owned Solana execution integration exist.",
  "Do not mark Solana trading as live. The existing Solana partner adapter remains a no-funds eligibility gate, not a trading venue.",
] as const;
const FUTURE_EVM = [
  "An EVM trading venue profile stays planned until reviewed Production access, current receipt, durable replay, and partner-owned EVM execution exist.",
  "Do not mark EVM trading as live. The EVM partner adapter remains eligibility preflight, not a trading venue or order router.",
] as const;

export const VENUE_PROFILE_REGISTRY: readonly VenueIntegrationProfile[] = [
  {
    profile_id: "generic_trading_venue",
    label: "Generic trading venue",
    ecosystem: "trading_venue",
    posture: "sandbox_preflight",
    supported_actions: ENABLE,
    supported_scopes: SCOPE,
    policy_result_category: "eligibility",
    assurance_boundary: "current_public_receipt",
    wallet_binding: "not_attached",
    current_receipt_required: true,
    durable_replay_required: true,
    network_id: null,
    docs_href: "/docs/trading-venue-profiles",
    kit_path: "/docs/starter-kit",
    abraxas_executes: false,
    funds_movement: false,
    connects_wallet: false,
    calls_venue_api: false,
    selectable_in_sandbox: true,
    future_requirements: [
      "Keep using this profile for existing sandbox venue preflight until a named venue profile is selected in Launchpad.",
    ],
  },
  {
    profile_id: "hyperliquid_trading_venue",
    label: "Hyperliquid-class venue (preflight only)",
    ecosystem: "trading_venue",
    posture: "sandbox_preflight",
    supported_actions: ENABLE,
    supported_scopes: SCOPE,
    policy_result_category: "eligibility",
    assurance_boundary: "current_public_receipt",
    wallet_binding: "not_attached",
    current_receipt_required: true,
    durable_replay_required: true,
    network_id: "hyperliquid_trading_venue",
    docs_href: "/docs/trading-venue-profiles",
    kit_path: "/docs/starter-kit",
    abraxas_executes: false,
    funds_movement: false,
    connects_wallet: false,
    calls_venue_api: false,
    selectable_in_sandbox: true,
    future_requirements: [
      VENUE_PROFILE_NO_PARTNERSHIP,
      "No Hyperliquid API, RPC, account, order, position, balance, or transaction code in Abraxas.",
    ],
  },
  {
    profile_id: "solana_trading_venue",
    label: "Solana trading venue (planned)",
    ecosystem: "solana",
    posture: "planned",
    supported_actions: ENABLE,
    supported_scopes: SCOPE,
    policy_result_category: "eligibility",
    assurance_boundary: "current_public_receipt",
    wallet_binding: "not_attached",
    current_receipt_required: true,
    durable_replay_required: true,
    network_id: null,
    docs_href: "/docs/trading-venue-profiles",
    kit_path: "/docs/starter-kit",
    abraxas_executes: false,
    funds_movement: false,
    connects_wallet: false,
    calls_venue_api: false,
    selectable_in_sandbox: false,
    future_requirements: FUTURE_SOLANA,
  },
  {
    profile_id: "evm_trading_venue",
    label: "EVM trading venue (planned)",
    ecosystem: "evm",
    posture: "planned",
    supported_actions: ENABLE,
    supported_scopes: SCOPE,
    policy_result_category: "eligibility",
    assurance_boundary: "current_public_receipt",
    wallet_binding: "not_attached",
    current_receipt_required: true,
    durable_replay_required: true,
    network_id: null,
    docs_href: "/docs/trading-venue-profiles",
    kit_path: "/docs/starter-kit",
    abraxas_executes: false,
    funds_movement: false,
    connects_wallet: false,
    calls_venue_api: false,
    selectable_in_sandbox: false,
    future_requirements: FUTURE_EVM,
  },
  {
    profile_id: "disabled_trading_venue",
    label: "Disabled venue profile",
    ecosystem: "trading_venue",
    posture: "disabled",
    supported_actions: ENABLE,
    supported_scopes: SCOPE,
    policy_result_category: "eligibility",
    assurance_boundary: "current_public_receipt",
    wallet_binding: "not_attached",
    current_receipt_required: true,
    durable_replay_required: true,
    network_id: null,
    docs_href: "/docs/trading-venue-profiles",
    kit_path: "/docs/starter-kit",
    abraxas_executes: false,
    funds_movement: false,
    connects_wallet: false,
    calls_venue_api: false,
    selectable_in_sandbox: false,
    future_requirements: [
      "This profile stays disabled. It exists so unknown, planned, and disabled postures are distinct denials.",
    ],
  },
];

export function getVenueProfile(profileId: string | null | undefined): VenueIntegrationProfile | null {
  if (!profileId || typeof profileId !== "string") return null;
  return VENUE_PROFILE_REGISTRY.find((entry) => entry.profile_id === profileId) ?? null;
}

export function isVenueProfileId(value: string): value is VenueProfileId {
  return (VENUE_PROFILE_IDS as readonly string[]).includes(value);
}

export function selectableSandboxVenueProfiles(): VenueIntegrationProfile[] {
  return VENUE_PROFILE_REGISTRY.filter((entry) => entry.selectable_in_sandbox && entry.posture === "sandbox_preflight");
}

export function publicVenueProfileMatrix() {
  return VENUE_PROFILE_REGISTRY.map((entry) => ({
    profile_id: entry.profile_id,
    label: entry.label,
    ecosystem: entry.ecosystem,
    posture: entry.posture,
    wallet_binding: entry.wallet_binding,
    docs_href: entry.docs_href,
    abraxas_executes: false as const,
    live: false as const,
    selectable_in_sandbox: entry.selectable_in_sandbox,
  }));
}
