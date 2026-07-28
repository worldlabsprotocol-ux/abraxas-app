// FILE: lib/positioningStrategy.ts
// Positioning guardrails. marketing vs docs split, north star, parked narratives.

/** The metric that compounds: apps that accept and act on Passport proof. */
export const RELYING_PARTY_NORTH_STAR =
  "Every application that accepts Abraxas Passport makes the network more valuable. Relying party adoption is the north star. credentials and SDK exist to get there.";

/**
 * Strategic north star (2026): portable eligibility, not "KYC for DeFi."
 * Businesses don't want identity — they want to sell. Every verification step is friction.
 * Abraxas = Stripe for eligibility: "Can this user legally use my service?"
 */
export const ELIGIBILITY_NORTH_STAR =
  "The internet's reusable verification layer. Reduce trust to one question: Can this user do this?";

/** Product-focused taglines (homepage hero may stay protocol-focused). */
export const PRODUCT_TAGLINE_OPTIONS = [
  "Verify once. Reuse everywhere.",
  "One verification. Unlimited trusted experiences.",
] as const;

/** Why a merchant integrates Abraxas instead of building verification in-house. */
export const WHY_INTEGRATE_ABRAXAS = [
  "Higher conversion — fewer abandoned signups from repeated document uploads",
  "Lower verification costs — reuse prior checks when policy allows",
  "Faster onboarding — one API instead of sign-up, email, KYC, age, fraud, review, audit",
  "Better privacy — merchants receive only the claims they need, not raw documents",
] as const;

/** What merchants want from the API — not documents, just claims. */
export const MERCHANT_CLAIMS_EXAMPLE = {
  age_over_21: true,
  identity_verified: true,
  country: "US",
  expires: "2028-05-10",
} as const;

/** Verification modules — each verified once, reused where appropriate. */
export const VERIFICATION_MODULES = [
  "Age (18+, 21+)",
  "Identity (government ID, biometrics, liveness)",
  "Jurisdiction (country, state, residency)",
  "Compliance (KYC, AML, sanctions)",
  "Professional (licenses, memberships)",
] as const;

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
