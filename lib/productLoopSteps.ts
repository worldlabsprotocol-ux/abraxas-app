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
  cta?: string;
}

export const PRODUCT_LOOP_STEPS: ProductLoopStep[] = [
  {
    id: "browse",
    title: "Browse verified assets",
    subtitle: "Assurance levels and registry state — no login required.",
    durationMs: 6000,
    image: "/assets/smyrna/011.webp",
    badge: "Public registry",
    metrics: [
      { label: "Assets", value: "4 listed" },
      { label: "Assurance", value: "L1–L4" },
      { label: "ID check", value: "When needed" },
    ],
  },
  {
    id: "book",
    title: "Book with Apple Pay or card",
    subtitle: "Pick dates · pay in fiat · settles automatically on-chain.",
    durationMs: 6000,
    image: CIELO_PORCH_IMAGE.src,
    imageObjectPosition: "center 40%",
    badge: "Seamless checkout",
    metrics: [
      { label: "Primary", value: "Apple Pay" },
      { label: "Alt", value: "USDC" },
      { label: "Est.", value: "~$1,240" },
    ],
  },
  {
    id: "signin",
    title: "Sign in with Google",
    subtitle: "Your wallet is ready in one click — no seed phrase, no extension.",
    durationMs: 5000,
    badge: "Passport ready",
    metrics: [
      { label: "Account", value: "Google" },
      { label: "Wallet", value: "Apple Wallet" },
      { label: "ID check", value: "Optional" },
    ],
  },
  {
    id: "pay",
    title: "Pay without thinking about rails",
    subtitle: "Fiat on-ramp or stablecoin · settlement captured · on-chain verify.",
    durationMs: 6000,
    image: CIELO_HERO_IMAGE.src,
    imageObjectPosition: CIELO_HERO_IMAGE.objectPosition,
    badge: "Payment captured",
    metrics: [
      { label: "Method", value: "Apple Pay" },
      { label: "Settles", value: "USDC" },
      { label: "Status", value: "Captured ✓" },
    ],
  },
  {
    id: "verify",
    title: "Verify on the public registry",
    subtitle: "Any partner checks your credential — assurance levels L1–L4, instant.",
    durationMs: 7000,
    badge: "✓ PORTABLE PROOF",
    metrics: [
      { label: "Standard", value: "W3C VC" },
      { label: "API", value: "/verify" },
      { label: "Reuse", value: "Any partner" },
    ],
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);
