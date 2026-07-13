// FILE: lib/messaging/bible.ts
// Approved core messaging — import in pages; full doc at content/MESSAGING_BIBLE.md

export const ABRAXAS_POSITIONING =
  "Abraxas is the reusable verification infrastructure for real-world assets.";

export const ABRAXAS_TAGLINE = "Verify once. Transact everywhere.";

export const ABRAXAS_PROBLEM_THESIS =
  "Tokenization alone is not enough. Repeated verification is the hidden tax killing institutional adoption of RWAs.";

export const APPROVED_PROOF_POINTS = [
  "Public registry — browse verified assets without login (Cielo, Smyrna, Naj Tulum)",
  "Cielo Sunrise genesis pilot — $1.1M independent appraisal, live STR, Superhost, USDC settlement on Sui",
  "Active design partners — names published when approved",
  "W3C-compatible credentials, zkLogin, policy engine, selective disclosure",
  "Live integration surfaces: Passport, AIL API, Cielo stablecoin checkout (pilot)",
] as const;

export const DO_NOT_USE = [
  '"Live" for partner integrations not yet in production',
  "Placeholder partner names in public-facing copy",
  "Invented TVL, user counts, or transaction volume",
  "Leading with tokenization or identity protocol jargon",
  "Guaranteed yield or investment return language",
  "Claiming third-party relying parties without signed approval",
] as const;

export const PRIMARY_CTAS = {
  registry: { label: "Browse the registry", href: "/#registry" },
  cielo: { label: "Cielo case study", href: "/case-studies/cielo" },
  passport: { label: "Get verified once", href: "/passport" },
  docs: { label: "Developer docs", href: "/docs" },
  integrations: { label: "Integrations", href: "/integrations" },
  designPartner: { label: "Talk to the team", href: "/design-partner" },
} as const;
