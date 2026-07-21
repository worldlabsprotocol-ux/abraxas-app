// FILE: lib/productVisualDemo.ts
// Minimal-label visual flows for premium demo recording.

import { COSMIC_PALETTE } from "@/lib/demoDesignSystem";

export const PRODUCT_DEMO_FLOWS = [
  {
    id: "passport",
    tab: "Passport",
    tagline: "Wallet → verify → credential",
    accent: COSMIC_PALETTE.violet,
    mesh: "violet" as const,
  },
  {
    id: "unlock",
    tab: "Unlock RWA",
    tagline: "Proof → access",
    accent: COSMIC_PALETTE.emerald,
    mesh: "emerald" as const,
  },
  {
    id: "dashboard",
    tab: "Dashboard",
    tagline: "Live yield · verified assets",
    accent: COSMIC_PALETTE.gold,
    mesh: "gold" as const,
  },
] as const;

export type ProductDemoFlowId = (typeof PRODUCT_DEMO_FLOWS)[number]["id"];

export const PASSPORT_VISUAL_STEPS = [
  { id: "wallet", label: "Connect", sub: "Sui zkLogin" },
  { id: "kyc", label: "Verify ID", sub: "Veriff" },
  { id: "credential", label: "Passport", sub: "W3C VC" },
] as const;

export const UNLOCK_VISUAL_STEPS = [
  { id: "locked", label: "Gated", sub: "Policy check" },
  { id: "proof", label: "Proof", sub: "Signed" },
  { id: "unlocked", label: "Unlocked", sub: "Transact" },
] as const;

export const DASHBOARD_ASSETS = [
  {
    id: "cielo",
    name: "Cielo Sunrise",
    type: "Hospitality",
    value: "$1.1M",
    yield: "14.6%",
    accent: COSMIC_PALETTE.gold,
    icon: "🏨",
  },
  {
    id: "chickasaw",
    name: "Chickasaw",
    type: "Land · 270 ac",
    value: "11 lots",
    yield: "Verified",
    accent: COSMIC_PALETTE.emerald,
    icon: "🌾",
  },
  {
    id: "music",
    name: "Royalties",
    type: "Music catalog",
    value: "Streams",
    yield: "Live",
    accent: COSMIC_PALETTE.cyan,
    icon: "♪",
  },
] as const;

export const DASHBOARD_HERO = {
  label: "Portfolio",
  total: "$1.1M+",
  yield: "14.6%",
  yieldLabel: "Projected yield",
} as const;
