// FILE: lib/positioningStrategy.ts
// Positioning guardrails. marketing vs docs split, north star, parked narratives.

/** The metric that compounds: apps that accept and act on Passport proof. */
export const RELYING_PARTY_NORTH_STAR =
  "Every application that accepts Abraxas Passport makes the network more valuable. Relying party adoption is the north star. credentials and SDK exist to get there.";

/** Homepage / hero. keep high-signal, no TTL/revocation nuance. */
export const MARKETING_HERO_TAGLINE = "Verify once. Transact everywhere.";

/** Docs / trust-framework only. honest refresh model. */
export const DOCS_REFRESH_PROMISE =
  "Verify once, reuse what remains valid, and refresh only what changed or expired.";

/** Park publicly until surface area supports it. internal direction only. */
export const PARKED_PUBLIC_NARRATIVES = [
  "Trust Orchestration Network",
  "Trust Coordination Layer",
  "Moving away from Passport as the hero product",
] as const;

export const BUILDER_PROOF_EXAMPLES = [
  {
    name: "Cielo Sunrise",
    outcome: "Verified guest booking in under two minutes. no ID re-upload per stay",
    href: "/case-studies/cielo",
  },
  {
    name: "Chickasaw Project",
    outcome: "Land diligence attested once. scoped disclosure for qualified counterparties",
    href: "/case-studies/chickasaw-project",
  },
] as const;

export const MAINNET_FOUNDER_PITCH =
  "Passport works in production today for real assets and pilot partners. Full open mainnet. audits done, external relying parties proven, automated refresh. is the sequence we're closing, not a distant rebuild.";
