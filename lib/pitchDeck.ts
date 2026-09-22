// Investor presentation grounded in the current product and public proof map.
export interface PitchSlide {
  id: string;
  title: string;
  bullets: string[];
  highlight?: string;
  link?: { label: string; href: string };
}

export const PITCH_DECK: PitchSlide[] = [
  {
    id: "problem",
    title: "Verification does not travel",
    bullets: [
      "Each protocol repeats sensitive eligibility checks",
      "Partners need a current result bound to their own policy and audience",
      "Holders should not disclose source evidence to every integration",
    ],
  },
  {
    id: "product",
    title: "A narrow result, checked again when used",
    bullets: [
      "Hosted request and fresh holder consent",
      "Partner-bound public receipt and one-time eligibility presentation",
      "The partner re-fetches validity and applies its own risk rules",
    ],
    link: { label: "Presentation protocol", href: "/docs/eligibility-presentation-protocol" },
  },
  {
    id: "sandbox",
    title: "A sandbox flow you can try",
    bullets: [
      "Good Trouble demonstrates a 21+ eligibility request",
      "The partner receives the result; underlying evidence stays private",
      "It is not a live retail checkout or transaction",
    ],
    link: { label: "Try the sandbox", href: "/good-trouble" },
  },
  {
    id: "institutional",
    title: "Institutional policy, limited to sandbox",
    bullets: [
      "An operator-controlled test result exercises the organization policy path",
      "Consent, revocation, expiry, and partner binding are enforced",
      "A live KYB issuer and external partner validation are still required",
    ],
    link: { label: "Inspect the proof map", href: "/institutional" },
  },
  {
    id: "chain",
    title: "One eligibility contract, two partner-owned gates",
    bullets: [
      "EVM and Solana gates consume a named access action once",
      "Local contract and ProgramTest coverage exists",
      "No public devnet or Mainnet gate deployment is claimed here",
    ],
    link: { label: "Verifier conformance", href: "/docs/onchain-verifier-conformance" },
  },
  {
    id: "boundary",
    title: "Partners keep execution authority",
    bullets: [
      "Abraxas does not move funds, place trades, or authorize wallet spending",
      "Protocols own the deployed gate, governance, AML/KYT, and transaction policy",
      "Mainnet requires separate Production review and verified deployment",
    ],
    link: { label: "Network readiness", href: "/docs/multichain-mainnet-readiness" },
  },
  {
    id: "milestones",
    title: "What turns the code into adoption",
    bullets: [
      "Human devnet deployment with independently observed configuration",
      "First unaffiliated end-to-end partner integration",
      "Measured current-receipt checks, replay rejection, and paid usage",
    ],
    highlight: "We report sandbox tests separately from Production usage.",
    link: { label: "Data room", href: "/investors" },
  },
];
