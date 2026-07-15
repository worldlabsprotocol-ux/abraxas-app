// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — Becker pain → Yan closed loop.

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

export interface ProductLoopStep {
  id: string;
  title: string;
  subtitle: string;
  /** One-line hook on the visual — demo format (Ansem punch, Becker clarity). */
  hook: string;
  durationMs: number;
  badge?: string;
  metrics?: { label: string; value: string }[];
  href: string;
  ctaLabel: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "spam",
    title: "Stop re-verifying the same asset",
    subtitle: "Every buyer asks for the same deed, survey, and ID. Your inbox becomes a forwarding loop — that is the hidden tax on RWAs.",
    hook: "47 emails. Same PDFs. Every time.",
    durationMs: 6500,
    badge: "The tax",
    metrics: [
      { label: "Trigger", value: "New buyer" },
      { label: "Action", value: "Re-send docs" },
      { label: "Cost", value: "Hours × deals" },
    ],
    href: "/#demo",
    ctaLabel: "See the loop",
  },
  {
    id: "pain",
    title: "Crypto had repeated KYC. RWAs had it worse.",
    subtitle: "Diligence buried in threads. Global buyers waiting. Trust stalls before the deal closes.",
    hook: "$1.6M on the line. Still in inbox.",
    durationMs: 5500,
    badge: "Breaking point",
    metrics: [
      { label: "Docs", value: "Same 11 plats" },
      { label: "Buyers", value: "Global" },
      { label: "Risk", value: "Version drift" },
    ],
    href: "/passport",
    ctaLabel: "Enter Passport",
  },
  {
    id: "verify-once",
    title: "Verify once on Abraxas Passport",
    subtitle: "Surveys, environmental, title — attested on-registry. Share permissioned proof, not attachments.",
    hook: "One upload. Every counterparty.",
    durationMs: 6500,
    badge: "Verify once",
    metrics: [
      { label: "Record", value: "ABX-RE-LAND-006" },
      { label: "Reuse", value: "Any partner" },
      { label: "Login", value: "Google · zkLogin" },
    ],
    href: "/passport",
    ctaLabel: "Create Passport",
  },
  {
    id: "global",
    title: "One profile. Every counterparty.",
    subtitle: "Land, hospitality, capital — one assurance record opens doors without re-forwarding.",
    hook: "$2.7M+ live on-registry",
    durationMs: 7000,
    badge: "Portable proof",
    metrics: [
      { label: "Registry", value: "$2.7M+ scope" },
      { label: "Partners", value: "Active sync" },
      { label: "Chain", value: "Portable proof" },
    ],
    href: "/#registry",
    ctaLabel: "Browse registry",
  },
  {
    id: "settle",
    title: "Inquire → verify → settle on Sui",
    subtitle: "Acquire on Abraxas. Partner updates sync on-protocol. USDC settlement — institutional closed loop.",
    hook: "Trust layer for real-world assets",
    durationMs: 7000,
    badge: "Closed loop",
    metrics: [
      { label: "Acquire", value: "On Abraxas" },
      { label: "Settle", value: "USDC · Sui" },
      { label: "Live", value: CPG_ASSET.name },
    ],
    href: CPG_ASSET.inquirePath,
    ctaLabel: "Acquire on Abraxas",
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);

export const PRODUCT_LOOP_HOME_PITCH =
  "Every RWA platform rebuilds trust from scratch. Abraxas makes trust portable — verify once, reuse across every app.";
