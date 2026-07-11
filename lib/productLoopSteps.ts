// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — distinct image/diagram per step.

import { CIELO_DOME_DECK_IMAGE } from "@/lib/data/cieloMedia";

export interface ProductLoopStep {
  id: string;
  title: string;
  subtitle: string;
  durationMs: number;
  image?: string;
  imageObjectPosition?: string;
  badge?: string;
  metrics?: { label: string; value: string }[];
  href: string;
  ctaLabel: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "browse",
    title: "Browse verified assets",
    subtitle: "Registry records with assurance levels — no login required.",
    durationMs: 6000,
    image: "/assets/smyrna/011.webp",
    imageObjectPosition: "center 35%",
    badge: "Public registry",
    metrics: [
      { label: "Assets", value: "4 listed" },
      { label: "Assurance", value: "L1–L4" },
      { label: "Login", value: "Not required" },
    ],
    href: "/#registry",
    ctaLabel: "Browse registry",
  },
  {
    id: "book",
    title: "Book with USDC on Sui",
    subtitle: "Pick dates at Cielo · pay in stablecoin · settlement on-chain today.",
    durationMs: 6000,
    image: "/assets/cielo/07.jpg",
    imageObjectPosition: "center 45%",
    badge: "Stablecoin checkout",
    metrics: [
      { label: "Asset", value: "Cielo Sunrise" },
      { label: "Pay", value: "USDC" },
      { label: "Chain", value: "Sui" },
    ],
    href: "/cielo/verified-rate",
    ctaLabel: "Start Cielo booking",
  },
  {
    id: "signin",
    title: "Sign in with Google",
    subtitle: "Your Sui wallet is ready in one click — no seed phrase, no extension.",
    durationMs: 5000,
    badge: "Passport ready",
    metrics: [
      { label: "Account", value: "Google" },
      { label: "Wallet", value: "Sui / zkLogin" },
      { label: "ID check", value: "Optional" },
    ],
    href: "/passport",
    ctaLabel: "Create Passport",
  },
  {
    id: "consent",
    title: "Approve what gets shared",
    subtitle: "Consent ceremony · partner sees eligibility only · receipt saved to Access.",
    durationMs: 6000,
    badge: "Consent captured",
    metrics: [
      { label: "Shared", value: "Minimum proof" },
      { label: "Stored", value: "Access tab" },
      { label: "Status", value: "Approved ✓" },
    ],
    href: "/passport?tab=access",
    ctaLabel: "View Access tab",
  },
  {
    id: "verify",
    title: "Verify on the public registry",
    subtitle: "Any partner checks ABX-RE-HOSP-001 — portable proof, instant lookup.",
    durationMs: 7000,
    image: CIELO_DOME_DECK_IMAGE.src,
    imageObjectPosition: CIELO_DOME_DECK_IMAGE.objectPosition,
    badge: "✓ PORTABLE PROOF",
    metrics: [
      { label: "Record", value: "ABX-RE-HOSP-001" },
      { label: "Tool", value: "/verify" },
      { label: "Reuse", value: "Any partner" },
    ],
    href: "/verify/ABX-RE-HOSP-001",
    ctaLabel: "Verify Cielo record",
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);
