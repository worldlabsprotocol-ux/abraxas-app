// FILE: lib/positioningStrategy.ts
// Positioning guardrails. marketing vs docs split, north star, parked narratives.

/**
 * Messaging hierarchy (lead with concrete category, earn the mission):
 * - Category: reusable verification layer (lead today)
 * - Mission (5–10yr): trust layer for the internet
 * - Product: never build verification again
 * - Mechanism: verify once, reuse everywhere
 * - Developer: await abraxas.can(...)
 */

/** Lead category. Concrete and credible today. */
export const ABRAXAS_CATEGORY = "The reusable verification layer for the internet.";

/** Long term mission. Earn this position after category is established. */
export const COMPANY_MISSION_LONG_TERM = "The trust layer for the internet.";

/** @deprecated Use ABRAXAS_CATEGORY for public lead copy. */
export const COMPANY_MISSION = ABRAXAS_CATEGORY;

/** Product pitch for merchants and CTOs. */
export const MERCHANT_PRODUCT_PITCH = "Never build verification again.";

/** Mechanism tagline. How it works for users. */
export const MECHANISM_TAGLINE = "Verify once. Reuse everywhere.";

/** Homepage hero. Protocol surface; mechanism variant in MECHANISM_TAGLINE. */
export const MARKETING_HERO_TAGLINE = "Verify once. Transact everywhere.";

/** Every business asks this. Identity is one input. */
export const TRUST_DECISION_QUESTION = "Can I trust this user enough to do X?";

/** Iconic company line. Verification is expensive; trust checks should be instant. */
export const ABRAXAS_ICONIC_LINE =
  "Every verification should happen once. Every trust decision should happen instantly.";

/** Network question merchants ask Abraxas. */
export const ELIGIBILITY_NORTH_STAR =
  "Has this already been verified by a trusted issuer?";

/** Proof line for Good Trouble — reusable trust, not document uploads. */
export const GOOD_TROUBLE_PROOF_LINE =
  "Good Trouble trusts an existing Abraxas credential instead of asking users to verify again.";

/** Current focus — protocol validation phase. */
export const CURRENT_FOCUS = [
  "Execute the Institutional Acceptance Test against production.",
  "Freeze the public contract in PROTOCOL_COMPATIBILITY.md.",
  "Tag v1.0.0-beta.0 and begin P1 integrity hardening.",
] as const;

/** Proof points to gather after launch (make positioning tangible). */
export const TARGET_PROOF_METRICS = [
  "Time to integrate: under 30 minutes",
  "Verification reuse: % of returning users who skip document upload",
  "Onboarding speed: average time to eligibility",
  "Business impact: % reduction in repeated verification requests",
] as const;

/** The metric that compounds: apps that accept and act on Passport proof. */
export const RELYING_PARTY_NORTH_STAR =
  "Every application that accepts Abraxas Passport makes the network more valuable. Relying party adoption is the north star. credentials and SDK exist to get there.";

export const DEVELOPER_API_NORTH_STAR = "await abraxas.can(user, { age: 21, identity: true })";

/** Primary SDK shape today. */
export const ABRAXAS_CAN_API_EXAMPLE = `const eligibility = await abraxas.can(user, {
  age: 21,
  identity: true,
  jurisdiction: ["US"],
});

if (eligibility.allowed) {
  unlockExperience();
}`;

/** Alternative SDK shapes to evaluate as the SDK evolves. */
export const ABRAXAS_TRUST_API_EXAMPLE = `const trust = await abraxas.trust(user);

if (trust.age21) { ... }
if (trust.identity) { ... }
if (trust.resident("US")) { ... }`;

export const ABRAXAS_ASSERT_API_EXAMPLE = `await abraxas.assert({
  age: 21,
  identity: true,
});`;

export const ABRAXAS_CHECK_API_EXAMPLE = `await abraxas.check({ age: 21 });`;

/** What every company builds in-house without Abraxas. */
export const BUILD_VERIFICATION_YOURSELF = [
  "Build identity flows",
  "Build age verification",
  "Integrate vendors",
  "Store sensitive documents",
  "Handle fraud",
  "Build review queues",
  "Maintain audit logs",
  "Update compliance rules",
  "Support users",
] as const;

/** The real competitor: DIY checks without a trusted issuer. */
export const DIY_ELIGIBILITY_COMPETITOR = `if (user.age >= 21) { ... }`;

export const ABRAXAS_ELIGIBILITY_ANSWER = `if (credential.age21) { ... }`;

/** Why a merchant integrates Abraxas instead of building verification in-house. */
export const WHY_INTEGRATE_ABRAXAS = [
  "Better conversion. Every extra upload loses users. Do not ask again if verification already exists.",
  "Lower compliance burden. Consume trusted credentials instead of becoming an identity company.",
  "Lower engineering cost. One SDK instead of months building verification infrastructure.",
  "Better privacy. Merchants need answers (over 21? verified? resident?), not passport images.",
  "Network effects. More merchants means more valuable credentials and more users arrive pre verified.",
] as const;

/** User side flywheel. */
export const ELIGIBILITY_FLYWHEEL = [
  "User verifies once",
  "Receives reusable credential",
  "Merchant integrates one API",
  "Instant eligibility check",
  "Less onboarding friction",
  "Higher conversion",
  "More merchants integrate",
  "Credential becomes more valuable",
  "More users verify once",
] as const;

/** Two sided network: issuers and relying parties meet on Abraxas. */
export const TRUST_NETWORK_TWO_SIDED = [
  "Verification providers issue credentials",
  "Abraxas routes trust between issuers and merchants",
  "Merchants consume only the claims they need",
  "More merchants join the network",
  "More issuers join to reach verified users",
  "Credentials become more valuable at scale",
] as const;

/** First wedge. Win these before expanding to licenses, accredited investor, education, etc. */
export const FIRST_WEDGE_FOCUS = [
  "Age restricted commerce",
  "Identity verification",
  "Reusable eligibility",
] as const;

/** Product-focused taglines (homepage hero may stay protocol-focused). */
export const PRODUCT_TAGLINE_OPTIONS = [
  "Verify once. Reuse everywhere.",
  "One verification. Unlimited trusted experiences.",
  "Never build verification again.",
  ABRAXAS_ICONIC_LINE,
] as const;

/** What merchants want from the API. Not documents, just claims. */
export const MERCHANT_CLAIMS_EXAMPLE = {
  age_over_21: true,
  identity_verified: true,
  country: "US",
  expires: "2028-05-10",
} as const;

/** Verification modules. Inputs to credentials, not the product. */
export const VERIFICATION_MODULES = [
  "Age (18+, 21+)",
  "Identity (government ID, biometrics, liveness)",
  "Jurisdiction (country, state, residency)",
  "Compliance (KYC, AML, sanctions)",
  "Professional (licenses, memberships)",
] as const;

/** Long-term category vision. */
export const ELIGIBILITY_CATEGORY_VISION =
  `Lead with ${ABRAXAS_CATEGORY} Mission: ${COMPANY_MISSION_LONG_TERM}`;

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
