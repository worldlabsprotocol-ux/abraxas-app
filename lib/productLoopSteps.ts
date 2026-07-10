// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — visuals + mock UI per step.

import { CIELO_HERO_IMAGE, CIELO_PORCH_IMAGE } from "@/lib/data/cieloMedia";

export interface ProductLoopStep {
  id: string;
  title: string;
  subtitle: string;
  durationMs: number;
  image?: string;
  imageObjectPosition?: string;
  badge?: string;
  metrics?: { label: string; value: string }[];
  /** Real route for this step — wired from homepage demo. */
  href: string;
  ctaLabel: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "browse",
    title: "Browse verified assets",
    subtitle: "See assurance levels and registry records — no login required.",
    durationMs: 6000,
    image: "/assets/smyrna/011.webp",
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
    title: "Start a verified stay",
    subtitle: "Pick dates at Cielo · Passport checks eligibility · share minimum proof.",
    durationMs: 6000,
    image: CIELO_PORCH_IMAGE.src,
    imageObjectPosition: "center 40%",
    badge: "Cielo pilot",
    metrics: [
      { label: "Asset", value: "Cielo Sunrise" },
      { label: "Proof", value: "Eligibility" },
      { label: "Est.", value: "Verified rate" },
    ],
    href: "/cielo/verified-rate",
    ctaLabel: "Try Cielo verified rate",
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
    image: CIELO_HERO_IMAGE.src,
    imageObjectPosition: CIELO_HERO_IMAGE.objectPosition,
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
    subtitle: "Any partner checks the record — portable proof, instant lookup.",
    durationMs: 7000,
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
