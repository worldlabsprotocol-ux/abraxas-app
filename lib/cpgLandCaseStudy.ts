// FILE: lib/cpgLandCaseStudy.ts
// CPG Land Sales · Grady County 270 — active land partner case study data.
// Pricing: seller ask (partner-provided L1) vs Abraxas registry reference (platform markup band).

/** Platform reference markup on partner seller ask — 20% (within 10–40% policy band). */
export const CPG_REGISTRY_MARKUP_RATE = 0.2;

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function abraxasRegistryReference(sellerAskUsd: number): number {
  return Math.round(sellerAskUsd * (1 + CPG_REGISTRY_MARKUP_RATE));
}

export const CPG_PARTNER = {
  name: "CPG Land Sales",
  contact: "Gabriel Corrales",
  website: "https://www.cpglandsales.com/",
  titleCompany: "Washita Valley Abstract · Chickasha, OK (Grady County seat)",
} as const;

export const CPG_ASSET = {
  id: "ABX-RE-LAND-006",
  designation: "ACTIVE LAND PARTNER · L2 REVIEW",
  name: "Grady County 270",
  subtitle: "~270 acres · 11 surveyed tracts · Oklahoma City growth corridor",
  location: "Grady County, Oklahoma · Blanchard / Chickasha area",
  image: "/assets/cpg/hero-oklahoma-land.jpg",
  heroVideo: "/assets/cpg/cpg-drone.mp4",
  heroVideoPoster: "/assets/cpg/hero-oklahoma-land.jpg",
  parentAcres: 270,
  availableLotsNote: "Lots 1 & 5 under contract as of Jul 2026 — remaining inventory per partner update",
  partnerSite: CPG_PARTNER.website,
  idLandMap: "https://id.land/maps/a4f54df1718764c5e2c82ebabb5d353c/share",
  lot4Mls: "https://www.zillow.com/homedetails/4-County-Street-2990-LOT-4-Blanchard-OK-73010/463636574_zpid/",
} as const;

export interface CpgLotRow {
  lot: number;
  acres: number;
  sellerAskUsd: number;
  status: "available" | "under_contract" | "contingent";
  notes?: string;
}

/** Seller ask per partner communications (Jul 2026). */
export const CPG_LOTS: CpgLotRow[] = [
  { lot: 1, acres: 16.15, sellerAskUsd: 0, status: "under_contract", notes: "16.15 ac · conventional lending · 20% down" },
  { lot: 2, acres: 13.32, sellerAskUsd: 99_900, status: "available" },
  { lot: 3, acres: 35.7, sellerAskUsd: 177_900, status: "available" },
  { lot: 4, acres: 32.72, sellerAskUsd: 173_900, status: "available", notes: "Live on MLS · Blanchard OK" },
  { lot: 5, acres: 34.46, sellerAskUsd: 175_900, status: "under_contract", notes: "Full asking · 50% down + bank finance" },
  { lot: 6, acres: 10.11, sellerAskUsd: 0, status: "available" },
  { lot: 7, acres: 29.19, sellerAskUsd: 0, status: "available" },
  { lot: 8, acres: 9.48, sellerAskUsd: 0, status: "available" },
  { lot: 9, acres: 18.93, sellerAskUsd: 0, status: "available" },
  { lot: 10, acres: 43.2, sellerAskUsd: 0, status: "available" },
  { lot: 11, acres: 27.74, sellerAskUsd: 0, status: "available" },
];

/** Aggregate seller asks from partner email (not sum of individual rows where TBD). */
export const CPG_PRICING = {
  fullProjectSellerAsk: 1_639_000,
  bulkFullProjectSellerAsk: 1_599_000,
  remaining9LotsSellerAsk: 1_347_200,
  remaining9LotsApprovalThreshold: 1_315_000,
  lots234BundleSellerAsk: 409_000,
  lots234ListTotal: 451_700,
  tenLot235AcresSellerAsk: 1_429_000,
} as const;

export const CPG_REGISTRY_VALUE = {
  fullProjectReference: abraxasRegistryReference(CPG_PRICING.fullProjectSellerAsk),
  bulkReference: abraxasRegistryReference(CPG_PRICING.bulkFullProjectSellerAsk),
  remaining9Reference: abraxasRegistryReference(CPG_PRICING.remaining9LotsSellerAsk),
  lots234BundleReference: abraxasRegistryReference(CPG_PRICING.lots234BundleSellerAsk),
} as const;

export const CPG_CONFLICTS = {
  headline: "Disclosure",
  items: [
    {
      topic: "Who sells the land",
      disclosure:
        "CPG Land Sales (Gabriel Corrales) is the seller. This listing is live on Abraxas — pricing, surveys, and lot status are shown for verified counterparty diligence. Contracts and closing run through CPG and Washita Valley Abstract, not Abraxas checkout.",
      implication: "Abraxas hosts the verified record; Gabe handles the deal.",
    },
    {
      topic: "What “non-binding” means on Abraxas",
      disclosure:
        "Browsing or verifying on Abraxas does not sign you up for a purchase. It is not a contract with Abraxas. The land sale itself is real — buyers work directly with CPG Land Sales like any other transaction.",
      implication: "This protects Abraxas as verification infrastructure; it does not mean the property is off-market or unavailable.",
    },
    {
      topic: "Pricing display",
      disclosure:
        "Seller ask figures are partner-provided (L1 reference). Abraxas registry reference values include a platform markup band (currently 20%) for verification-scope and protocol economics — not the price CPG will accept at closing.",
      implication: "Counterparties must confirm live pricing with the seller before any contract. Registry numbers support diligence, not solicitation.",
    },
    {
      topic: "Pipeline stage",
      disclosure:
        "Active land partner project with surveys, Phase I ESA, and early retail traction (Lots 1 & 5 under contract pre-full MLS launch). Abraxas L2 review in progress — not MARKETPLACE_LIVE like Cielo Sunrise.",
      implication: "Lot availability changes quickly. This case study documents verification progress and sourced partner statements, not a securities offering.",
    },
    {
      topic: "Securities & investment",
      disclosure:
        "Bulk or fractional structures discussed with partners are illustrative verification scenarios only. Securities counsel required before any investment solicitation. Not investment advice.",
      implication: "Use /verify for assurance scope — not as an investment recommendation.",
    },
  ],
} as const;

export const CPG_DILIGENCE = [
  "Survey completion and tract layout for all 11 splits (plat PDFs on file)",
  "Phase I Environmental Site Assessment — clean bill of health (partner attestation)",
  "Preliminary minor subdivision positioning and utility/access review",
  "County-maintained public roads · electric available · ~80' expected water well depth",
  "Title and closing via Washita Valley Abstract (Chickasha · Grady County seat)",
  "Early market traction: Lot 5 full-asking contract pre-broad MLS; Lot 1 contract in progress",
] as const;

export const CPG_SOURCES = [
  {
    claim: "Parent parcel acreage",
    value: "~270 ac",
    level: "L2 Review",
    source: "Survey plats (11 lots) + partner intake",
    asOf: "2026-07-05",
    method: "Recorded survey cross-check",
    expires: "On plat amendment",
  },
  {
    claim: "Aggregate seller ask (11 lots)",
    value: formatUsd(CPG_PRICING.fullProjectSellerAsk),
    level: "L1 Reference",
    source: "CPG Land Sales · Gabriel Corrales",
    asOf: "2026-07-05",
    method: "Partner-provided — not independent appraisal",
    expires: "On contract or repricing",
  },
  {
    claim: "Abraxas registry reference (full project)",
    value: formatUsd(CPG_REGISTRY_VALUE.fullProjectReference),
    level: "L1 Reference",
    source: "Abraxas registry economics band (+20%)",
    asOf: "2026-07-13",
    method: "Verification-scope reference — not seller ask",
    expires: "On partner repricing",
  },
  {
    claim: "Lots 2–4 bundle seller ask",
    value: formatUsd(CPG_PRICING.lots234BundleSellerAsk),
    level: "L1 Reference",
    source: "CPG Land Sales (81.74 ac contiguous)",
    asOf: "2026-07-05",
    method: "Partner discount from $451,700 list",
    expires: "On sale",
  },
  {
    claim: "Phase I ESA",
    value: "Complete · clean",
    level: "L2 Review",
    source: "Partner attestation + report on file",
    asOf: "2026-06-01",
    method: "Environmental vendor report (scope review pending)",
    expires: "Annual refresh typical",
  },
  {
    claim: "Lot 4 MLS traction",
    value: "Live listing",
    level: "L1 Reference",
    source: "Zillow MLS cross-check",
    asOf: "2026-07-05",
    method: "Public listing URL",
    expires: "On sale or delist",
  },
] as const;

export const CPG_PROOF = [
  { label: "Public verify record", desc: "Registry assurance scope for relying parties", href: `/verify/${encodeURIComponent(CPG_ASSET.id)}` },
  { label: "Partner site (reference)", desc: "Independent seller marketing — not Abraxas-operated", href: CPG_PARTNER.website },
  { label: "Lot 4 MLS (independent)", desc: "Third-party listing cross-check", href: CPG_ASSET.lot4Mls },
  { label: "Interactive parcel map", desc: "id.land share map from partner", href: CPG_ASSET.idLandMap },
  { label: "Owner portal", desc: "Verify-once sharing for bulk counterparty diligence", href: "/portal" },
] as const;

export const CPG_SURVEY_FILES: { lot: number; acres: number; label: string; href: string }[] = [
  { lot: 0, acres: 270, label: "Parent parcel plat (updated)", href: "/assets/cpg/surveys/Original_Property_Survey_Plat_UPDATED__1__ae94.pdf" },
  { lot: 0, acres: 0, label: "Warranty deed (reference)", href: "/assets/cpg/surveys/Warranty_Deed_Grady_270_d0fe.pdf" },
  { lot: 1, acres: 16.15, label: "Lot 1 survey", href: "/assets/cpg/surveys/Lot_1_-_16.15_Acre_Tract_Survey_Plat_7599.pdf" },
  { lot: 2, acres: 13.32, label: "Lot 2 survey", href: "/assets/cpg/surveys/Lot_2_-_13.32_Acre_Tract_Survey_Plat_9c20.pdf" },
  { lot: 3, acres: 35.7, label: "Lot 3 survey", href: "/assets/cpg/surveys/Lot_3_-_35.70_Acre_Tract_Survey_Plat_f283.pdf" },
  { lot: 4, acres: 32.72, label: "Lot 4 survey", href: "/assets/cpg/surveys/Lot_4_-_32.72_Acre_Tract_Survey_Plat__1__7d86.pdf" },
  { lot: 5, acres: 34.46, label: "Lot 5 survey", href: "/assets/cpg/surveys/Lot_5_-_34.46_Acre_Tract_Survey_Plat_59a6.pdf" },
  { lot: 6, acres: 10.11, label: "Lot 6 survey", href: "/assets/cpg/surveys/Lot_6_-_10.11_Acre_Tract_Survey_Plat_a266.pdf" },
  { lot: 7, acres: 29.19, label: "Lot 7 survey", href: "/assets/cpg/surveys/Lot_7_-_29.19_Acre_Tract_Survey_Plat_bfd8.pdf" },
  { lot: 8, acres: 9.48, label: "Lot 8 survey", href: "/assets/cpg/surveys/Lot_8_-_9.48_Acre_Tract_Survey_Plat_4e16.pdf" },
  { lot: 9, acres: 18.93, label: "Lot 9 survey", href: "/assets/cpg/surveys/Lot_9_-_18.93_Acre_Tract_Survey_Plat_89ab.pdf" },
  { lot: 10, acres: 43.2, label: "Lot 10 survey", href: "/assets/cpg/surveys/Lot_10_-_43.20_Acre_Tract_Survey_Plat_c0fe.pdf" },
  { lot: 11, acres: 27.74, label: "Lot 11 survey", href: "/assets/cpg/surveys/Lot_11_-_27.74_Acre_Tract_Survey_Plat_3e19.pdf" },
];

export const CPG_WHAT_THIS_PROVES = [
  "Multi-lot Oklahoma land can enter the Abraxas registry with survey-backed evidence scope — not a single-asset hospitality template.",
  "Verify-once sharing lets bulk buyers, lenders, and partners check diligence without re-forwarding plat PDFs through a chain.",
  "Honest L1/L2 labeling: partner seller ask vs Abraxas registry reference — no fake appraisal badges.",
  "Early retail traction (pre-full MLS) supports partner pricing statements without Abraxas guaranteeing outcomes.",
  "Abraxas hosts the verified record; CPG Land Sales handles contracts and closing in Oklahoma.",
] as const;
