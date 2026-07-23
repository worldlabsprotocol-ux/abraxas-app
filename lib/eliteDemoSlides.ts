// FILE: lib/eliteDemoSlides.ts
// Elite visual slideshow configs. minimal text, cosmic frames.

import type { MeshKey } from "@/components/home/cinematic/demoPremium";
import { COSMIC_PALETTE } from "@/lib/demoDesignSystem";

export type EliteSlideVisual =
  | "hero-debt"
  | "hero-passport"
  | "hero-proof"
  | "stat-row"
  | "layer-stack"
  | "network-ring"
  | "asset-pair"
  | "api-flow"
  | "gates"
  | "claims"
  | "agentic-duo"
  | "unlock-row"
  | "icon-hero";

export interface EliteSlide {
  id: string;
  label: string;
  headline: string;
  visual: EliteSlideVisual;
  /** Optional micro copy. one line max */
  micro?: string;
  stats?: { label: string; value: string }[];
  pills?: string[];
}

export interface EliteDemoConfig {
  id: string;
  mesh: MeshKey;
  accent: string;
  slides: EliteSlide[];
  autoMs?: number;
  aspect?: "phone" | "wide" | "cinema";
}

export const HERO_ELITE_DEMO: EliteDemoConfig = {
  id: "hero-verify-loop",
  mesh: "gold",
  accent: COSMIC_PALETTE.gold,
  aspect: "cinema",
  autoMs: 4500,
  slides: [
    {
      id: "debt",
      label: "01 · Debt",
      headline: "Every app rebuilds trust.",
      visual: "hero-debt",
      micro: "7× repeated verification",
      pills: ["Marketplace", "Lender", "Custody", "Ops"],
    },
    {
      id: "passport",
      label: "02 · Credential",
      headline: "One verification.",
      visual: "hero-passport",
      micro: "Issued once",
    },
    {
      id: "proof",
      label: "03 · Proof",
      headline: "Anyone verifies.",
      visual: "hero-proof",
      micro: "No relay required",
    },
  ],
};

export const STATUS_ELITE_DEMO: EliteDemoConfig = {
  id: "production-status",
  mesh: "emerald",
  accent: COSMIC_PALETTE.emerald,
  aspect: "wide",
  slides: [
    {
      id: "live",
      label: "Live",
      headline: "Production today.",
      visual: "icon-hero",
      micro: "Cielo · Chickasaw",
      stats: [
        { label: "Verify API", value: "Live" },
        { label: "Proof", value: "Signed" },
        { label: "Registry", value: "Live" },
      ],
    },
    {
      id: "gates",
      label: "Gates",
      headline: "Staged mainnet.",
      visual: "gates",
      micro: "Honest rollout",
    },
    {
      id: "rp",
      label: "RP",
      headline: "External verify path.",
      visual: "api-flow",
      micro: "abx_live_ key",
    },
  ],
};

export const BUILD_ELITE_DEMO: EliteDemoConfig = {
  id: "build-integrate",
  mesh: "ice",
  accent: COSMIC_PALETTE.cyan,
  aspect: "wide",
  slides: [
    {
      id: "embed",
      label: "Embed",
      headline: "Verify API in your app.",
      visual: "api-flow",
      micro: "REST · verify",
    },
    {
      id: "verify",
      label: "Verify",
      headline: "Policy decision.",
      visual: "hero-proof",
      micro: "agent.proceed",
    },
    {
      id: "reuse",
      label: "Reuse",
      headline: "Zero re-KYC.",
      visual: "unlock-row",
      micro: "Cross-app",
    },
  ],
};

export const STACK_ELITE_DEMO: EliteDemoConfig = {
  id: "stack-position",
  mesh: "violet",
  accent: COSMIC_PALETTE.violet,
  aspect: "wide",
  slides: [
    {
      id: "apps",
      label: "Apps",
      headline: "Distribution layer.",
      visual: "layer-stack",
      pills: ["Robinhood", "Marketplaces", "Lenders"],
    },
    {
      id: "issuance",
      label: "Mint",
      headline: "Tokenization.",
      visual: "stat-row",
      stats: [
        { label: "Figure", value: "RWA" },
        { label: "Ondo", value: "Credit" },
        { label: "Plume", value: "Chain" },
      ],
    },
    {
      id: "abraxas",
      label: "Trust",
      headline: "Abraxas underneath.",
      visual: "layer-stack",
      micro: "Verify once",
    },
  ],
};

export const NETWORK_ELITE_DEMO: EliteDemoConfig = {
  id: "network-effect",
  mesh: "gold",
  accent: COSMIC_PALETTE.gold,
  aspect: "wide",
  slides: [
    {
      id: "first",
      label: "01",
      headline: "First issuer verifies.",
      visual: "network-ring",
      micro: "Attest once",
    },
    {
      id: "second",
      label: "02",
      headline: "Apps accept proof.",
      visual: "unlock-row",
      micro: "No resend",
    },
    {
      id: "compound",
      label: "03",
      headline: "Moat compounds.",
      visual: "network-ring",
      micro: "Each RP adds value",
    },
  ],
};

export const REFERENCE_ELITE_DEMO: EliteDemoConfig = {
  id: "reference-proof",
  mesh: "emerald",
  accent: COSMIC_PALETTE.emerald,
  aspect: "wide",
  slides: [
    {
      id: "cielo",
      label: "Cielo",
      headline: "$1.1M · live STR.",
      visual: "asset-pair",
      micro: "ABX-RE-HOSP-001",
    },
    {
      id: "chickasaw",
      label: "Land",
      headline: "270 ac · surveyed.",
      visual: "asset-pair",
      micro: "ABX-RE-LAND-006",
    },
    {
      id: "verify",
      label: "Proof",
      headline: "Independent check.",
      visual: "hero-proof",
      micro: "GET /api/proof",
    },
  ],
};

export const PARTNERS_ELITE_DEMO: EliteDemoConfig = {
  id: "partners-policy",
  mesh: "slate",
  accent: COSMIC_PALETTE.violet,
  aspect: "wide",
  slides: [
    {
      id: "claims",
      label: "Claims",
      headline: "Separate attestations.",
      visual: "claims",
      pills: ["Identity", "Asset", "Policy"],
    },
    {
      id: "engine",
      label: "Policy",
      headline: "Server-side gates.",
      visual: "api-flow",
      micro: "Fail closed",
    },
    {
      id: "reuse",
      label: "Reuse",
      headline: "Portable proof.",
      visual: "hero-proof",
    },
  ],
};

export const AGENTIC_ELITE_DEMO: EliteDemoConfig = {
  id: "agentic-finance",
  mesh: "emerald",
  accent: COSMIC_PALETTE.emerald,
  aspect: "wide",
  slides: [
    {
      id: "robinhood",
      label: "Act",
      headline: "Robinhood MCP.",
      visual: "agentic-duo",
      micro: "Agents trade",
    },
    {
      id: "verify",
      label: "Verify",
      headline: "Abraxas proof.",
      visual: "hero-proof",
      micro: "agent.valid",
    },
    {
      id: "compose",
      label: "Stack",
      headline: "Verify → act.",
      visual: "unlock-row",
      micro: "Fail closed",
    },
  ],
};

export const ELITE_DEMO_BY_ID: Record<string, EliteDemoConfig> = {
  [HERO_ELITE_DEMO.id]: HERO_ELITE_DEMO,
  [STATUS_ELITE_DEMO.id]: STATUS_ELITE_DEMO,
  [BUILD_ELITE_DEMO.id]: BUILD_ELITE_DEMO,
  [STACK_ELITE_DEMO.id]: STACK_ELITE_DEMO,
  [NETWORK_ELITE_DEMO.id]: NETWORK_ELITE_DEMO,
  [REFERENCE_ELITE_DEMO.id]: REFERENCE_ELITE_DEMO,
  [PARTNERS_ELITE_DEMO.id]: PARTNERS_ELITE_DEMO,
  [AGENTIC_ELITE_DEMO.id]: AGENTIC_ELITE_DEMO,
};
