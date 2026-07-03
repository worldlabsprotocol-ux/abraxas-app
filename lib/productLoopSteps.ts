// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — ~30s full loop (6s per step).

export interface ProductLoopStep {
  id: string;
  title: string;
  subtitle: string;
  durationMs: number;
  image?: string;
  badge?: string;
  metrics?: { label: string; value: string }[];
  cta?: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "browse",
    title: "Browse verified assets",
    subtitle: "Real photos, assurance levels, and registry state — no login required.",
    durationMs: 6000,
    image: "/assets/cielo/06.jpg",
    badge: "AAS-1 Verified",
    metrics: [
      { label: "Appraised", value: "$1.1M" },
      { label: "Cash yield", value: "14.6%" },
      { label: "Collateral", value: "96/100" },
    ],
  },
  {
    id: "book",
    title: "Book on the live calendar",
    subtitle: "Pick dates · Protocol Calendar blocks availability · operator confirms within 24h.",
    durationMs: 6000,
    image: "/assets/cielo/14.jpg",
    badge: "Live booking",
    metrics: [
      { label: "Check-in", value: "Fri 4:00 PM" },
      { label: "Check-out", value: "Mon 10:00 AM" },
      { label: "Est. USDC", value: "$1,240" },
    ],
  },
  {
    id: "signin",
    title: "Sign in with Google",
    subtitle: "zkLogin creates your Sui wallet — no seed phrase, no browser extension.",
    durationMs: 5000,
    image: "/assets/cielo/08.jpg",
    badge: "Passport ready",
    metrics: [
      { label: "Account", value: "Google → Sui" },
      { label: "ID check", value: "Optional" },
      { label: "Stamps", value: "Earn over time" },
    ],
  },
  {
    id: "pay",
    title: "Pay USDC on Sui",
    subtitle: "One-click stablecoin transfer · asset settlement container · on-chain verify.",
    durationMs: 6000,
    image: "/assets/cielo/17.jpg",
    badge: "Payment captured",
    metrics: [
      { label: "Asset", value: "USDC" },
      { label: "Network", value: "Sui mainnet" },
      { label: "Status", value: "Captured ✓" },
    ],
  },
  {
    id: "verify",
    title: "Verify on the public registry",
    subtitle: "Any relying party pastes ABX-RE-HOSP-001 — assurance taxonomy L1–L4 instant.",
    durationMs: 7000,
    image: "/assets/cielo/01.jpg",
    badge: "✓ VERIFIED & ACTIVE",
    metrics: [
      { label: "Registry ID", value: "ABX-RE-HOSP-001" },
      { label: "Stage", value: "MARKETPLACE_LIVE" },
      { label: "Assurance", value: "L3 Attested" },
    ],
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);
