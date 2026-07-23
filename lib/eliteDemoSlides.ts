// FILE: lib/eliteDemoSlides.ts
// Elite visual slideshow configs. Short words. Big headlines.

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
      label: "01 · Problem",
      headline: "Every app asks again.",
      visual: "hero-debt",
      micro: "Same checks, seven times",
      pills: ["Store", "Bank", "Hotel", "Custody"],
    },
    {
      id: "passport",
      label: "02 · Fix",
      headline: "Check once.",
      visual: "hero-passport",
      micro: "Save the proof",
    },
    {
      id: "proof",
      label: "03 · Result",
      headline: "Anyone can check it.",
      visual: "hero-proof",
      micro: "No inbox needed",
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
      headline: "Working today.",
      visual: "icon-hero",
      micro: "Cielo · Chickasaw",
      stats: [
        { label: "Verify", value: "Live" },
        { label: "Proof", value: "Signed" },
        { label: "Registry", value: "Live" },
      ],
    },
    {
      id: "grow",
      label: "Grow",
      headline: "More partners join.",
      visual: "network-ring",
      micro: "Trust spreads",
    },
    {
      id: "rp",
      label: "Check",
      headline: "Apps read the proof.",
      visual: "api-flow",
      micro: "One API call",
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
      label: "Step 1",
      headline: "Add verify to your app.",
      visual: "api-flow",
      micro: "Simple API",
    },
    {
      id: "verify",
      label: "Step 2",
      headline: "Get yes or no.",
      visual: "hero-proof",
      micro: "Clear decision",
    },
    {
      id: "reuse",
      label: "Step 3",
      headline: "Use the same proof again.",
      visual: "unlock-row",
      micro: "No repeat KYC",
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
      label: "Top",
      headline: "Apps people use.",
      visual: "layer-stack",
      pills: ["Trade", "Market", "Lend"],
    },
    {
      id: "issuance",
      label: "Middle",
      headline: "Tokens get made.",
      visual: "stat-row",
      stats: [
        { label: "Credit", value: "Pools" },
        { label: "Real estate", value: "SPVs" },
        { label: "Funds", value: "On-chain" },
      ],
    },
    {
      id: "abraxas",
      label: "Base",
      headline: "Abraxas checks trust.",
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
      headline: "Someone checks first.",
      visual: "network-ring",
      micro: "One proof",
    },
    {
      id: "second",
      label: "02",
      headline: "Other apps trust it.",
      visual: "unlock-row",
      micro: "No re-upload",
    },
    {
      id: "compound",
      label: "03",
      headline: "More apps join.",
      visual: "network-ring",
      micro: "Trust grows",
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
      label: "Hotel",
      headline: "Cielo is real.",
      visual: "asset-pair",
      micro: "Live bookings",
    },
    {
      id: "chickasaw",
      label: "Land",
      headline: "Land files checked.",
      visual: "asset-pair",
      micro: "270 acres",
    },
    {
      id: "verify",
      label: "Proof",
      headline: "You can check it.",
      visual: "hero-proof",
      micro: "Public record",
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
      headline: "ID. Asset. Rules.",
      visual: "claims",
      pills: ["Identity", "Asset", "Policy"],
    },
    {
      id: "engine",
      label: "Gate",
      headline: "Server says yes or no.",
      visual: "api-flow",
      micro: "Fail closed",
    },
    {
      id: "reuse",
      label: "Reuse",
      headline: "Proof travels with you.",
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
      headline: "Agents can trade.",
      visual: "agentic-duo",
      micro: "Execution layer",
    },
    {
      id: "verify",
      label: "Verify",
      headline: "Abraxas checks first.",
      visual: "hero-proof",
      micro: "Proof gate",
    },
    {
      id: "compose",
      label: "Order",
      headline: "Check. Then act.",
      visual: "unlock-row",
      micro: "Safe by default",
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
