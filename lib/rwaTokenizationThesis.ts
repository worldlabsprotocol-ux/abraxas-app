// FILE: lib/rwaTokenizationThesis.ts
// RWA tokenization thesis — sourced from Medium essay (July 2026).

export const RWA_THESIS_MEDIUM_URL =
  "https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595" as const;

export const RWA_THESIS_SLUG = "what-is-real-world-asset-tokenization" as const;

export const RWA_THESIS_TITLE = "What Is Real-World Asset Tokenization?";

export const RWA_THESIS_SUBTITLE =
  "Abraxas: the verification layer institutions need beyond tokenization.";

export const RWA_THESIS_SECTION_INTRO =
  "Market context, institutional steps, diligence questions, and why minting alone is not enough.";

export const RWA_THESIS_SECTION_NOTE =
  "Market data, institutional steps, diligence questions, and live asset references appear here only — not repeated in the product deck above.";

export const RWA_THESIS_HOME_LEAD =
  "The RWA market is moving from experimentation to institutional adoption. Tokenization creates digital ownership — but institutions still need trusted verification before capital moves.";

export const RWA_THESIS_HERO_PILL =
  "New article: What is RWA tokenization? — verification beyond minting";

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

export interface RwaThesisSlide {
  id: string;
  label: string;
  headline: string;
  body: string;
  visual: "market" | "define" | "steps" | "gap" | "examples" | "abraxas";
}

/** Homepage slideshow — full essay without long scroll. */
export const RWA_THESIS_SLIDES: RwaThesisSlide[] = [
  {
    id: "market",
    label: "01 · Market",
    headline: "Institutional RWA tokenization is measured in trillions.",
    body: "From ~$1.8T in 2025 toward multi-trillion projections by 2033. Banks, asset managers, and fintechs are moving past experiments into production infrastructure.",
    visual: "market",
  },
  {
    id: "define",
    label: "02 · Definition",
    headline: "Tokenization converts ownership into on-chain representation.",
    body: "Real estate, bonds, private credit, metals, carbon credits, and art become digital tokens — transparent records instead of siloed paper and databases.",
    visual: "define",
  },
  {
    id: "steps",
    label: "03 · Process",
    headline: "Seven institutional steps from asset to market.",
    body: "Select → structure → value → mint → onboard investors → manage lifecycle → enable secondary trading where permitted.",
    visual: "steps",
  },
  {
    id: "gap",
    label: "04 · The gap",
    headline: "Token creation alone is not enough.",
    body: "Every counterparty still asks who owns the asset, whether eligibility passed, and if compliance can travel — or be reused instead of repeated.",
    visual: "gap",
  },
  {
    id: "examples",
    label: "05 · Proof",
    headline: "This is already happening — and on Abraxas.",
    body: "BlackRock BUIDL, private credit pools, and tokenized real estate show the market is real. Cielo Sunrise and Chickasaw diligence are live verify records on Abraxas today.",
    visual: "examples",
  },
  {
    id: "abraxas",
    label: "06 · Abraxas",
    headline: "The verification layer beyond tokenization.",
    body: RWA_THESIS_ABRAXAS_CLOSE,
    visual: "abraxas",
  },
];
