// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — re-verify pain → Abraxas closed loop.

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

export interface ProductLoopStep {
  id: string;
  title: string;
  subtitle: string;
  durationMs: number;
  badge?: string;
  metrics?: { label: string; value: string }[];
  href: string;
  ctaLabel: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "spam",
    title: "Stop the re-verify email spiral",
    subtitle: "Every new client asks for the same survey, deed, and ID — your inbox becomes a forwarding loop.",
    durationMs: 6500,
    badge: "The pain",
    metrics: [
      { label: "Trigger", value: "New buyer" },
      { label: "Action", value: "Re-send PDFs" },
      { label: "Cost", value: "Hours × deals" },
    ],
    href: "/#demo",
    ctaLabel: "Watch demo",
  },
  {
    id: "pain",
    title: "We need a solution moment",
    subtitle: "Important diligence buried under duplicate requests — trust erodes before the deal even starts.",
    durationMs: 5500,
    badge: "Breaking point",
    metrics: [
      { label: "Docs", value: "Same 11 plats" },
      { label: "Clients", value: "Global buyers" },
      { label: "Risk", value: "Version drift" },
    ],
    href: "/passport",
    ctaLabel: "Enter Passport",
  },
  {
    id: "verify-once",
    title: "Upload once on Abraxas Passport",
    subtitle: "Surveys, environmental, title — verified on-registry. Share permissioned proof, not attachments.",
    durationMs: 6500,
    badge: "Verify once",
    metrics: [
      { label: "Record", value: "ABX-RE-LAND-006" },
      { label: "Reuse", value: "Any counterparty" },
      { label: "Login", value: "Google · zkLogin" },
    ],
    href: "/passport",
    ctaLabel: "Create Passport",
  },
  {
    id: "global",
    title: "Share to global buyers from one profile",
    subtitle: "International land, hospitality, capital — one assurance record opens doors without re-forwarding.",
    durationMs: 7000,
    badge: "Global reach",
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
    title: "Close in USDC on Sui — closed loop",
    subtitle: "Acquire on Abraxas, partner updates sync automatically, settlement stays on-protocol — institutional scale.",
    durationMs: 7000,
    badge: "Closed loop",
    metrics: [
      { label: "Acquire", value: "On Abraxas" },
      { label: "Settle", value: "USDC · Sui" },
      { label: "Target", value: "$110M+ infra" },
    ],
    href: CPG_ASSET.inquirePath,
    ctaLabel: "Acquire on Abraxas",
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);
