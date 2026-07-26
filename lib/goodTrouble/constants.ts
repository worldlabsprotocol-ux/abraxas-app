// FILE: lib/goodTrouble/constants.ts
// Good Trouble Cannabis — pilot relying party constants (Kansas City, MO).

export const GOOD_TROUBLE_PARTNER_ID = "good-trouble-cannabis" as const;

/** Sandbox pilot policy — age-gated retail eligibility via Abraxas Passport claims */
export const GOOD_TROUBLE_RETAIL_POLICY_ID = "good-trouble-retail-v1" as const;

/** Future batch attestation policy (COA + chain-of-custody) */
export const GOOD_TROUBLE_BATCH_POLICY_ID = "good-trouble-batch-v1" as const;

export const GOOD_TROUBLE_BRAND = {
  name: "Good Trouble",
  legalName: "Good Trouble Cannabis",
  website: "https://www.goodtroublecanna.com/",
  location: "Kansas City, Missouri",
  established: 2022,
  tagline: "Damn good cannabis.",
  mission:
    "To cultivate premium, organic cannabis and meaningful experiences that inspire connection and elevate perspective.",
  qualityPromise:
    "The same potency, purity, and punch — every time. Consistency you can feel is not an accident.",
  adultUseNotice:
    "Products are intended for adults 21+. Consume responsibly and in compliance with applicable Missouri law.",
  /** Public site age gate copy (partner website) — Abraxas replaces checkbox with portable proof */
  ageGate: {
    eyebrow: "BEFORE YOU ENTER",
    headline: "OLD ENOUGH TO KNOW BETTER?",
    requirement: "YOU MUST BE 21 OR OLDER TO ENTER",
  },
} as const;

export const GOOD_TROUBLE_PILOT_DISCLAIMER =
  "Pilot integration on Abraxas sandbox infrastructure. Not a live dispensary checkout gate until partner promotion, production API key, and compliance review are complete.";

export const GOOD_TROUBLE_INTEGRATION_PATH = "/good-trouble" as const;
