// FILE: lib/infrastructurePositioning.ts
// Infrastructure narrative — trust layer under the RWA stack (not another marketplace).

export const ABRAXAS_INFRA_CATEGORY = "Trust infrastructure for tokenized assets";

export const ABRAXAS_INFRA_EMOTION = "Stop proving your assets over and over.";

export const ABRAXAS_INFRA_MECHANISM = "One verification. Unlimited applications.";

export const ABRAXAS_INFRA_HEADLINE = "Verify once. Transact everywhere.";

export const ABRAXAS_INFRA_NARRATIVE =
  "Every RWA app is rebuilding trust from scratch. Abraxas makes trust portable.";

export const ABRAXAS_INFRA_POSITIONING =
  "Not another issuer. Not another marketplace. Not another chain. The identity and verification layer every tokenized asset application plugs into.";

export const ABRAXAS_EMBED_PITCH =
  "Already issuing tokenized assets? Embed Abraxas Passport so verified assets move across applications without repeating due diligence.";

export const RWA_STACK_LAYERS: {
  id: string;
  label: string;
  examples: string;
  role: string;
  highlight?: boolean;
}[] = [
  {
    id: "apps",
    label: "Applications & distribution",
    examples: "Robinhood · Securitize · Superstate · embedded finance",
    role: "Where users discover and hold tokenized assets",
  },
  {
    id: "issuance",
    label: "Issuance & tokenization",
    examples: "Figure · Ondo · Plume · Centrifuge · Maple",
    role: "Where assets are structured and minted on-chain",
  },
  {
    id: "abraxas",
    label: "Abraxas — trust infrastructure",
    examples: "Passport · Verification API · Reusable diligence · Policy engine",
    role: "Where identity, compliance, and asset proof are verified once and reused everywhere",
    highlight: true,
  },
];

export const NETWORK_EFFECT_STEPS = [
  {
    step: "01",
    title: "First issuer verifies",
    body: "Surveys, title, KYC, and asset scope attested on-registry once.",
  },
  {
    step: "02",
    title: "Second platform accepts",
    body: "A marketplace or ATS reads the same Passport — no document resend.",
  },
  {
    step: "03",
    title: "Third lender finances",
    body: "Credit and eligibility policies evaluate live claims, not email PDFs.",
  },
  {
    step: "04",
    title: "Fourth marketplace lists",
    body: "Each participant makes every Passport more valuable. That compounding is the moat.",
  },
] as const;

export const BUILD_WITH_CAPABILITIES = [
  "Verification API",
  "Passport SDK",
  "W3C Credentials",
  "Reusable Compliance",
  "Portable Identity",
  "Zero repeated due diligence",
] as const;

export const INTEGRATE_CAPABILITIES = [
  "Universal Asset Passport",
  "Verification API",
  "Reusable compliance",
  "Due diligence layer",
  "Cross-platform trust",
] as const;

export const BUILD_FOR_AUDIENCES = [
  "RWA protocols & tokenization platforms",
  "Broker-dealers & ATSs",
  "Custodians & lending protocols",
  "Embedded finance products (Robinhood-style)",
  "Wallets & consumer apps gating on verified identity",
] as const;

export const NOT_FOR_AUDIENCES = [
  "Teams looking for a retail RWA marketplace",
  "Issuers who only need a one-off listing with no reuse",
  "Protocols that want to rebuild KYC from scratch per app",
] as const;

export const TOKENIZED_STOCKS_PITCH =
  "Abraxas lets your application reuse verified assets across marketplaces, lenders, custodians, and financial institutions. Instead of verifying every asset again — verify once, then integrate everywhere.";

export const CINEMATIC_UNLOCK_TARGETS = [
  "Marketplace",
  "Custodian",
  "Robinhood",
  "Lender",
  "Wallet",
  "Exchange",
] as const;

export const CINEMATIC_LOOP_MS = 24000;

export const CINEMATIC_PHASE_MS = [7000, 7000, 10000] as const;

export const CINEMATIC_MERGE_LINE = "One proof. Every future.";

export const CINEMATIC_HOLD_LINE = "One Passport. Zero repeated diligence.";

export const HOME_BUILD_BRIDGE =
  "Build once. Verify once. Counterparties verify the cryptographic proof — not your reputation.";

export const BUILD_WITH_OUTCOMES: { label: string; outcome: string }[] = [
  { label: "Verification API", outcome: "Policy decisions in one call" },
  { label: "Passport SDK", outcome: "Embed trust in days, not quarters" },
  { label: "W3C Credentials", outcome: "Portable proof, not PDF attachments" },
  { label: "Reusable Compliance", outcome: "Works across every counterparty" },
  { label: "Portable Identity", outcome: "Travels with every deal" },
  { label: "Zero repeated due diligence", outcome: "Never prove the same thing twice" },
];

export const DEVELOPER_QUICKSTARTS = [
  {
    title: "5-minute trust check",
    href: "/docs/sui",
    desc: "Wallet trust status before any gated action",
  },
  {
    title: "Partner verification API",
    href: "/docs/partner-verification-requests",
    desc: "Create requests · consent · policy decisions",
  },
  {
    title: "Architecture & trust model",
    href: "/docs/architecture",
    desc: "AIL layers, credential portability, audit trail",
  },
  {
    title: "Relying party program",
    href: "/integrations/relying-parties",
    desc: "Onboard as a counterparty that accepts Passport proof",
  },
] as const;
