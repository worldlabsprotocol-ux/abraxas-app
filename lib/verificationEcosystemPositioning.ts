// FILE: lib/verificationEcosystemPositioning.ts
// Cross-industry positioning: Abraxas as the reusable verification layer protocols plug into.

export const VERIFICATION_ECOSYSTEM_EYEBROW = "Verification layer";

export const VERIFICATION_ECOSYSTEM_HEADLINE =
  "The pre-check layer every regulated industry repeats.";

export const VERIFICATION_ECOSYSTEM_LEAD =
  "Cannabis, spirits, exchanges, iGaming, hospitality — users follow the law, but the parade of ID uploads leaves them out. Abraxas issues portable proof once. Your app calls one API with your policy_id. No checkbox theater.";

export const VERIFICATION_ECOSYSTEM_INSIGHT =
  "We started with blockchain and trading gates. The pattern is the same everywhere: verify once, policy-check everywhere, audit trail included. Abraxas is the layer other protocols embed — not another inbox relay.";

/** Core vertical table — extends beyond any single pilot partner */
export interface VerificationVerticalRow {
  vertical: string;
  partnerToday: string;
  abraxasPath: string;
  status: "live" | "pilot" | "template";
}

export const VERIFICATION_VERTICAL_TABLE: VerificationVerticalRow[] = [
  {
    vertical: "Cannabis retail",
    partnerToday: "Good Trouble (KC, est. 2022)",
    abraxasPath: "Passport on /passport → retail policy verify → batch COA registry",
    status: "pilot",
  },
  {
    vertical: "Spirits & alcohol",
    partnerToday: "Template ready",
    abraxasPath: "Same Passport, spirits-retail-v1 policy — jurisdiction rules per counsel",
    status: "template",
  },
  {
    vertical: "Crypto-native gates",
    partnerToday: "Same architecture",
    abraxasPath: "Wallet binding + credential verify instead of Discord role bots",
    status: "live",
  },
  {
    vertical: "RWA & real estate",
    partnerToday: "Cielo · Chickasaw",
    abraxasPath: "Asset proof + investor eligibility without repeating diligence",
    status: "live",
  },
  {
    vertical: "iGaming & sportsbook",
    partnerToday: "Policy template",
    abraxasPath: "Age at signup, enhanced KYC on spend thresholds — one reusable credential",
    status: "template",
  },
  {
    vertical: "Fintech & lending",
    partnerToday: "Market pattern",
    abraxasPath: "KYC outcome portable across products — lenders read proof, not raw PII",
    status: "template",
  },
  {
    vertical: "Hospitality & travel",
    partnerToday: "Market pattern",
    abraxasPath: "Check-in eligibility and chargeback risk without re-scanning ID every stay",
    status: "template",
  },
  {
    vertical: "Gig & contractor platforms",
    partnerToday: "Market pattern",
    abraxasPath: "Background-check outcome as signed claim — not another vendor portal",
    status: "template",
  },
];

/**
 * Industries with repeated verification friction (market scan).
 * Same user story: enter regulated surface → upload ID again → wait → hope it works.
 */
export const REPEATED_VERIFICATION_INDUSTRIES = [
  {
    id: "cannabis",
    label: "Cannabis & hemp",
    friction: "Age + state eligibility on every online order and delivery",
    regulation: "State cannabis boards, METRC-style traceability",
  },
  {
    id: "spirits",
    label: "Alcohol & spirits D2C",
    friction: "Age gates and ID scans at checkout — repeated per retailer",
    regulation: "State ABC laws, delivery age verification",
  },
  {
    id: "crypto",
    label: "Crypto exchanges & DeFi",
    friction: "Full KYC per exchange, per bridge, per custody product",
    regulation: "FinCEN, Travel Rule, state BitLicense",
  },
  {
    id: "igaming",
    label: "iGaming & sports betting",
    friction: "Age at registration, enhanced checks on deposit — per operator",
    regulation: "UK Gambling Commission, US state gaming boards",
  },
  {
    id: "rwa",
    label: "RWA & private markets",
    friction: "Accreditation and AML repeated for every deal room",
    regulation: "Reg D, jurisdictional securities rules",
  },
  {
    id: "hospitality",
    label: "Hotels & short-term rental",
    friction: "ID at check-in, damage holds, cross-border travel",
    regulation: "Local lodging ordinances, payment network rules",
  },
  {
    id: "fintech",
    label: "Neobanks & lending",
    friction: "KYC stack duplicated across cards, loans, and BNPL",
    regulation: "BSA/AML, CIP, ongoing monitoring",
  },
  {
    id: "gaming-social",
    label: "Gaming & social platforms",
    friction: "Age tiers and wallet gates — Discord bots and manual mod queues",
    regulation: "EU DSA, UK Online Safety Act, COPPA-adjacent flows",
  },
  {
    id: "tobacco-vape",
    label: "Tobacco & vape e-commerce",
    friction: "Age verification per merchant — same driver's license, again",
    regulation: "FDA PACT Act, state delivery bans",
  },
  {
    id: "insurance",
    label: "Insurance & benefits",
    friction: "Identity and eligibility re-proved across quotes and portals",
    regulation: "State insurance departments, HIPAA where applicable",
  },
] as const;

export const PROTOCOL_EMBED_PITCH = {
  headline: "Plug Abraxas into your stack",
  body: "One POST /api/credentials/verify with your policy_id. Your backend gets proceed / valid — not a PDF of someone's passport. Embed the age-gate widget or call the API from your checkout.",
  steps: [
    "User verifies once on abraxas.app/passport (Abraxas Verify — camera or upload)",
    "You receive a presentation JWT or proof_id",
    "Your server runs policy — age, jurisdiction, batch COA, wallet binding",
    "Signed authentication_proof returned — auditable, reusable, revocable",
  ],
} as const;

export const VERIFICATION_NEXT_STEPS = [
  {
    title: "Good Trouble → production API key",
    detail: "Promote sandbox pilot to production age gate on their real retail flow.",
  },
  {
    title: "First spirits partner",
    detail: "Clone spirits-retail-v1 with counsel-approved jurisdiction rules.",
  },
  {
    title: "Embeddable age-gate widget",
    detail: "Drop-in component that calls Abraxas instead of a checkbox — optional when ready.",
  },
] as const;
