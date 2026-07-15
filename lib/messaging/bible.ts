// FILE: lib/messaging/bible.ts
// Approved core messaging — import in pages; full doc at content/MESSAGING_BIBLE.md

export const ABRAXAS_POSITIONING =
  "Abraxas is the reusable verification infrastructure for real-world assets — the trust layer every tokenized asset application plugs into.";

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
  "Trust Orchestration Network / Trust Coordination Layer (premature public rebrand)",
  "Hero copy about TTL, revocation, or cryptographic mechanics — belongs in docs",
  "Execution risk framing publicly — project progress and inevitability instead",
] as const;

/** Marketing surfaces: simple hero. Docs: honest refresh/revocation. */
export const POSITIONING_SPLIT = {
  marketing: "Verify once. Transact everywhere. — Passport-forward, high-signal hero.",
  documentation: "TTL, refresh triggers, fail-closed verify — trust-framework and relying-party docs.",
} as const;

export const NORTH_STAR_METRIC =
  "Applications that accept and act on Abraxas Passport proof — relying party adoption.";

export const PRIMARY_CTAS = {
  registry: { label: "Browse the registry", href: "/#registry" },
  cielo: { label: "Cielo case study", href: "/case-studies/cielo" },
  passport: { label: "Get verified once", href: "/passport" },
  docs: { label: "Developer docs", href: "/docs" },
  integrations: { label: "Integrate Abraxas", href: "/integrate" },
  developers: { label: "Developer docs", href: "/developers" },
  designPartner: { label: "Talk to the team", href: "/design-partner" },
} as const;
