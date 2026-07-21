// FILE: lib/rwaTokenizationThesis.ts
// RWA tokenization thesis — sourced from Medium essay (July 2026).

export const RWA_THESIS_MEDIUM_URL =
  "https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595" as const;

export const RWA_THESIS_SLUG = "what-is-real-world-asset-tokenization" as const;

export const RWA_THESIS_TITLE = "What Is Real-World Asset Tokenization?";

export const RWA_THESIS_SUBTITLE =
  "Abraxas: the verification layer institutions need beyond tokenization.";

export const RWA_THESIS_HOME_LEAD =
  "The RWA market is moving from experimentation to institutional adoption. Tokenization creates digital ownership — but institutions still need trusted verification before capital moves.";

export const RWA_THESIS_HERO_PILL =
  "New essay: What is RWA tokenization? — verification beyond minting";

export const RWA_THESIS_MARKET_STATS = [
  { label: "2025 market", value: "$1.8T", detail: "RWA tokenization (industry estimates)" },
  { label: "2033 projection", value: "$24.5T", detail: "42.1% CAGR scenario" },
  { label: "McKinsey base", value: "~$2T", detail: "Tokenized market cap by 2030" },
] as const;

export const RWA_TOKENIZATION_STEPS = [
  { step: "01", title: "Asset selection", body: "Identify the physical or financial asset to tokenize." },
  { step: "02", title: "Legal structuring", body: "Define ownership rights and regulatory framework." },
  { step: "03", title: "Valuation", body: "Establish market value and appraisal discipline." },
  { step: "04", title: "Token creation", body: "Issue blockchain tokens representing ownership." },
  { step: "05", title: "Investor onboarding", body: "Identity, compliance, and eligibility checks." },
  { step: "06", title: "Asset management", body: "Transfers, distributions, and lifecycle records." },
  { step: "07", title: "Secondary trading", body: "Eligible investors trade interests where permitted." },
] as const;

export const RWA_INSTITUTION_QUESTIONS = [
  "Who owns the asset?",
  "Has ownership been verified?",
  "Has investor eligibility been confirmed?",
  "Can compliance travel across counterparties?",
  "Can verification be reused instead of repeated?",
] as const;

export const RWA_THESIS_ACTS = [
  "Institutions are entering RWA tokenization — the market is measured in trillions, not experiments.",
  "Seven steps: select, structure, value, mint, onboard, manage, trade — tokenization creates the digital representation.",
  "Token creation alone is not enough — every counterparty still re-asks who, what, and whether policy passed.",
  "Abraxas is the verify layer — reusable cryptographic proof before agents act or capital allocates.",
] as const;

export const RWA_THESIS_ABRAXAS_CLOSE =
  "Tokenization provides the digital representation. Abraxas provides the trust infrastructure that lets those assets move securely, compliantly, and with proof across markets.";
