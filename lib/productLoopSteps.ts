// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — Revolut-like flow, minimal Cielo imagery.

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
    image: "/assets/smyrna/011.webp",
    badge: "Public registry",
    metrics: [
      { label: "Assets", value: "4 listed" },
      { label: "Assurance", value: "L1–L4" },
      { label: "KYC", value: "Optional" },
    ],
  },
  {
    id: "book",
    title: "Book with Apple Pay or card",
    subtitle: "Pick dates · pay in fiat · USDC settles on Sui automatically.",
    durationMs: 6000,
    image: "/assets/cielo/08.jpg",
    badge: "Revolut-like checkout",
    metrics: [
      { label: "Primary", value: "Apple Pay" },
      { label: "Alt", value: "USDC on Sui" },
      { label: "Est.", value: "~$1,240" },
    ],
  },
  {
    id: "signin",
    title: "Sign in with Google",
    subtitle: "zkLogin creates your Sui wallet — no seed phrase, no browser extension.",
    durationMs: 5000,
    badge: "Passport ready",
    metrics: [
      { label: "Account", value: "Google → Sui" },
      { label: "Wallet", value: "Apple Wallet" },
      { label: "ID check", value: "Optional" },
    ],
  },
  {
    id: "pay",
    title: "Pay without thinking about rails",
    subtitle: "Fiat on-ramp or one-click USDC · asset settlement container · on-chain verify.",
    durationMs: 6000,
    badge: "Payment captured",
    metrics: [
      { label: "Method", value: "Apple Pay" },
      { label: "Settles", value: "USDC · Sui" },
      { label: "Status", value: "Captured ✓" },
    ],
  },
  {
    id: "verify",
    title: "Verify on the public registry",
    subtitle: "Any relying party checks your credential — assurance taxonomy L1–L4 instant.",
    durationMs: 7000,
    image: "/assets/worldwearables/naj.jpg",
    badge: "✓ PORTABLE PROOF",
    metrics: [
      { label: "Standard", value: "W3C VC" },
      { label: "API", value: "/verify" },
      { label: "Reuse", value: "Any partner" },
    ],
  },
];

export const PRODUCT_LOOP_TOTAL_MS = PRODUCT_LOOP_STEPS.reduce((s, step) => s + step.durationMs, 0);
