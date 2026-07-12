// FILE: lib/productLoopSteps.ts
// Auto-advancing product walkthrough — diagram-only visuals, copy lives in sidebar.

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
    id: "browse",
    title: "Browse verified assets",
    subtitle: "Public registry with assurance levels — no login required.",
    durationMs: 6000,
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
    subtitle: "Cielo pilot — stablecoin checkout with on-chain settlement.",
    durationMs: 6000,
    badge: "Pilot · USDC",
    metrics: [
      { label: "Asset", value: "Cielo Sunrise" },
      { label: "Pay", value: "USDC" },
      { label: "Chain", value: "Sui" },
    ],
    href: "/cielo/verified-rate",
    ctaLabel: "Start Cielo flow",
  },
  {
    id: "signin",
    title: "Sign in with Google",
    subtitle: "Sui wallet ready in one click — no seed phrase.",
    durationMs: 5000,
    badge: "Passport",
    metrics: [
      { label: "Account", value: "Google" },
      { label: "Wallet", value: "Sui / zkLogin" },
      { label: "ID check", value: "When needed" },
    ],
    href: "/passport",
    ctaLabel: "Create Passport",
  },
  {
    id: "consent",
    title: "Approve what gets shared",
    subtitle: "Partner sees eligibility only — receipt saved to Access.",
    durationMs: 6000,
    badge: "Consent",
    metrics: [
      { label: "Shared", value: "Minimum proof" },
      { label: "Hidden", value: "ID documents" },
      { label: "Receipt", value: "Access tab" },
    ],
    href: "/passport?tab=access",
    ctaLabel: "View Access tab",
  },
  {
    id: "verify",
    title: "Verify on the public registry",
    subtitle: "Any partner checks ABX-RE-HOSP-001 — portable proof.",
    durationMs: 7000,
    badge: "Portable proof",
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
