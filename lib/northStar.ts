// FILE: lib/northStar.ts
// Abraxas North Star — one page every feature must satisfy.

export const ABRAXAS_ONE_LINER =
  "Abraxas removes redundant verification so trusted people and trusted assets can move faster — with only the minimum information needed, shared only when it's needed.";

export const ABRAXAS_CUDA =
  "Every credential issued today works everywhere tomorrow.";

export const ABRAXAS_PRODUCT =
  "Trust as an API. Passport is the UX.";

export const ABRAXAS_HEADLINE = "Stop repeating verification.";

export const ABRAXAS_SUBHEAD =
  "One identity. One asset record. One check. Use it everywhere.";

export const ABRAXAS_BECKER_PITCH =
  "Every company keeps asking for the same information. We make that happen once.";

export const ABRAXAS_OPERATOR_OUTCOME =
  "Your guests go from sign-up to verified booking in under two minutes — and sensitive documents never sit in your inbox.";

export interface NorthStarPrinciple {
  id: string;
  title: string;
  body: string;
}

export const NORTH_STAR_PRINCIPLES: NorthStarPrinciple[] = [
  {
    id: "imagination-gap",
    title: "Remove the imagination gap",
    body: "Show. Don't explain. Replace abstract labels with outcomes people can picture.",
  },
  {
    id: "verify-once",
    title: "Verify once. Never ask twice.",
    body: "Every repeated upload is a tax on liquidity. Reuse is the product.",
  },
  {
    id: "minimum-proof",
    title: "Ask for the minimum proof",
    body: "Partners get yes, no, or review — never a document folder by default.",
  },
  {
    id: "one-action",
    title: "One action. One outcome.",
    body: "Every screen has one primary CTA. If there are two equals, simplify.",
  },
  {
    id: "reduce-friction",
    title: "Every feature reduces friction",
    body: "If it adds steps without removing repeated work, it probably shouldn't ship.",
  },
  {
    id: "verification-first",
    title: "Verification before tokenization",
    body: "Trust creates assets. Assets don't create trust.",
  },
  {
    id: "systems-not-demos",
    title: "Build systems, not demos",
    body: "If it can't survive without you in the room, it isn't finished.",
  },
  {
    id: "reusable",
    title: "Every credential should become reusable",
    body: "Value compounds when proof travels across partners without re-collection.",
  },
  {
    id: "integrate-once",
    title: "Partners integrate once",
    body: "Everything else should come from policy — not another bespoke integration.",
  },
  {
    id: "five-year-old",
    title: "Five-year-old test",
    body: "If someone can't explain Abraxas after using it once, keep simplifying.",
  },
];

export interface NorthStarPhase {
  id: string;
  letter: string;
  title: string;
  goal: string;
  bullets: string[];
  exitCriteria: string;
}

export const NORTH_STAR_PHASES: NorthStarPhase[] = [
  {
    id: "remove-friction",
    letter: "A",
    title: "Remove friction",
    goal: "Finish the loop. Nothing breaks. A five-year-old can get through it.",
    bullets: [
      "Session + wallet bind reliable on mobile",
      "No duplicate profile or wallet flows",
      "One home for verification, wallets, and access",
    ],
    exitCriteria: "The loop is boring — it works every time without explanation.",
  },
  {
    id: "undeniable-proof",
    letter: "B",
    title: "Create undeniable proof",
    goal: "One operator. One issuer. One relying party. One completed flow. Measure everything.",
    bullets: [
      "Onboarding time · documents avoided · approval time",
      "Drop-off · support tickets · repeat users",
      "One reference quote with numbers",
    ],
    exitCriteria: "One operator says: this saved us time and guests completed onboarding.",
  },
  {
    id: "productize-story",
    letter: "C",
    title: "Productize the story",
    goal: "Package technology as outcomes — never as infrastructure jargon.",
    bullets: [
      "Never upload your driver's license again",
      "Share only what they're asking for",
      "Verify once · use everywhere",
    ],
    exitCriteria: "A non-technical operator explains Abraxas in one minute without help.",
  },
  {
    id: "scale-systems",
    letter: "D",
    title: "Scale systems",
    goal: "Operator onboarding before operator volume — not more features.",
    bullets: [
      "Implementation guide · pilot metrics · API examples",
      "Partner success playbooks · support docs",
      "Issuers and relying parties expand from proof, not pitches",
    ],
    exitCriteria: "100 operators signing tomorrow breaks operations — not trust in the demo.",
  },
];

export const VERTICAL_SEQUENCE = [
  {
    order: 1,
    name: "Hospitality",
    why: "High-frequency verification — learn fast (Cielo and similar operators).",
    status: "active" as const,
  },
  {
    order: 2,
    name: "Tribal land & mineral rights",
    why: "High-stakes documents — after hospitality loop is undeniable.",
    status: "next" as const,
  },
  {
    order: 3,
    name: "Financial assets",
    why: "Reuse the same trust engine once identity + asset proof compound.",
    status: "later" as const,
  },
];

export const DESIGN_PARTNER_PROFILE = [
  "Verify people repeatedly",
  "Handle sensitive documents today",
  "Already have digital workflows",
  "Can decide quickly (not a 18-month procurement cycle)",
  "Willing to co-design and measure outcomes",
];

export const DESIGN_PARTNER_OFFER = [
  "Direct access to the team — white-glove implementation",
  "Influence on roadmap for your vertical",
  "Early adoption terms for production rollout",
  "Joint case study when metrics prove out",
];

export const DESIGN_PARTNER_ASK = [
  "One real workflow to wire — not a vanity pilot",
  "Honest feedback weekly during implementation",
  "Permission to measure: time saved, drop-off, documents avoided",
  "Optional public reference when it works",
];

export const WORKFLOW_BEFORE = [
  "Operator A → upload ID → verify",
  "Operator B → upload same ID → verify",
  "Marketplace → upload again → verify",
  "Lender → upload again → verify",
];

export const WORKFLOW_AFTER = [
  "Verify once",
  "Reuse permissioned proof",
  "Marketplace · lender · registry · operator — done",
];
