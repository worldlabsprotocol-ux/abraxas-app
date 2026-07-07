// FILE: lib/capabilityStatus.ts
// Live / Pilot / Demo / Planned — honest status for homepage claims.

export type CapabilityStatus = "live" | "pilot" | "demo" | "planned";

export const CAPABILITY_STATUS_META: Record<
  CapabilityStatus,
  { label: string; color: string; description: string }
> = {
  live: {
    label: "Live",
    color: "#10B981",
    description: "Click and test independently today.",
  },
  pilot: {
    label: "Pilot",
    color: "#F59E0B",
    description: "Real partner or design-partner flow under supervision.",
  },
  demo: {
    label: "Demo",
    color: "#8B5CF6",
    description: "Polished interface; production settlement may be limited.",
  },
  planned: {
    label: "Planned",
    color: "#6B7280",
    description: "On the roadmap — not yet available.",
  },
};

export const HOMEPAGE_THESIS = {
  oneLiner:
    "Abraxas is a verification network for real-world assets. Passport proves who can transact; Registry proves what is real; partner APIs enforce trust at the moment of action.",
  productNotMarketplace:
    "The product is your Passport — not another marketplace. Listings and booking flows are proofs that the network works.",
  chainStory:
    "Abraxas uses Sui zkLogin for low-friction identity creation. Identity credentials are chain-neutral; wallet bindings and settlement enforcement are chain-specific (Sui today). Legacy Solana RWA tooling is being retired from the public surface.",
} as const;
