// FILE: lib/cpgLandCaseStudy.ts
// CPG Land Sales · Grady County 270 — active Oklahoma land partner listing.

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export const CPG_PARTNER = {
  name: "CPG Land Sales",
  contact: "Gabriel Corrales",
  website: "https://www.cpglandsales.com/",
  titleCompany: "Washita Valley Abstract · Chickasha, OK",
} as const;

export const CPG_ASSET = {
  id: "ABX-RE-LAND-006",
  designation: "ACTIVE LAND LISTING · VERIFIED PARTNER",
  name: "Grady County 270",
  subtitle: "~270 acres · 11 surveyed tracts · Oklahoma City growth corridor",
  location: "Grady County, Oklahoma · Blanchard / Chickasha area",
  image: "/assets/cpg/hero-oklahoma-land.jpg",
  heroVideo: "/assets/cpg/cpg-drone.mp4",
  heroVideoPoster: "/assets/cpg/hero-oklahoma-land.jpg",
  parentAcres: 270,
  availableLotsNote: "Strong early traction — Lots 1 & 5 under contract before full MLS launch. Remaining inventory moving fast.",
  partnerSite: CPG_PARTNER.website,
  idLandMap: "https://id.land/maps/a4f54df1718764c5e2c82ebabb5d353c/share",
  lot4Mls: "https://www.zillow.com/homedetails/4-County-Street-2990-LOT-4-Blanchard-OK-73010/463636574_zpid/",
} as const;

export interface CpgLotRow {
  lot: number;
  acres: number;
  priceUsd: number;
  status: "available" | "under_contract" | "contingent";
  notes?: string;
}

export const CPG_LOTS: CpgLotRow[] = [
  { lot: 1, acres: 16.15, priceUsd: 0, status: "under_contract", notes: "Under contract · conventional financing" },
  { lot: 2, acres: 13.32, priceUsd: 99_900, status: "available" },
  { lot: 3, acres: 35.7, priceUsd: 177_900, status: "available" },
  { lot: 4, acres: 32.72, priceUsd: 173_900, status: "available", notes: "Live on MLS · gaining offers" },
  { lot: 5, acres: 34.46, priceUsd: 175_900, status: "under_contract", notes: "Full asking · under contract" },
  { lot: 6, acres: 10.11, priceUsd: 0, status: "available" },
  { lot: 7, acres: 29.19, priceUsd: 0, status: "available" },
  { lot: 8, acres: 9.48, priceUsd: 0, status: "available" },
  { lot: 9, acres: 18.93, priceUsd: 0, status: "available" },
  { lot: 10, acres: 43.2, priceUsd: 0, status: "available" },
  { lot: 11, acres: 27.74, priceUsd: 0, status: "available" },
];

export const CPG_PRICING = {
  fullProject: 1_639_000,
  bulkFullProject: 1_599_000,
  remaining9Lots: 1_347_200,
  remaining9LotsFastApproval: 1_315_000,
  lots234Bundle: 409_000,
  lots234List: 451_700,
  tenLots235Acres: 1_429_000,
} as const;

/** Registry / TVL roll-up — partner list pricing (same numbers shown on case study). */
export const CPG_REGISTRY_VALUE_USD = CPG_PRICING.fullProject;

export const CPG_HIGHLIGHTS = [
  {
    title: "Market momentum",
    body: "Lot 5 closed at full asking before broad retail launch. Lot 1 under contract. Lot 4 live on MLS with buyer traction — demand is real, not projected.",
  },
  {
    title: "Ready to close",
    body: "Surveys complete on all 11 tracts. Phase I environmental clean. County roads, electric on site, ~80' water well depth. Cash deals ~3 weeks; bank loans 30–45 days.",
  },
  {
    title: "Oklahoma City corridor",
    body: "Strong usability and terrain, ag flexibility, homestead and recreational appeal, proximity to OKC growth. Flat and rolling mix with tree coverage — excellent land.",
  },
  {
    title: "Bulk & bundle options",
    body: "Full ~270-acre project, remaining 9-lot package, or contiguous Lots 2–4 (81.74 ac) at $409,000 — priced for buyers who move decisively.",
  },
] as const;

export const CPG_DILIGENCE = [
  "Survey completion and tract layout for all 11 splits — plat PDFs on file",
  "Phase I Environmental Site Assessment complete · clean bill of health",
  "Preliminary minor subdivision positioning · utility and access reviewed",
  "County-maintained public roads · electric available",
  "Title and closing via Washita Valley Abstract (Chickasha · Grady County seat)",
  "Lot 5 full-asking contract and Lot 1 contract secured pre-full MLS release",
] as const;

export const CPG_SOURCES = [
  {
    claim: "Project size",
    value: "~270 ac · 11 lots",
    level: "L2 Review",
    source: "Recorded survey plats",
    asOf: "2026-07-05",
  },
  {
    claim: "Full project price",
    value: formatUsd(CPG_PRICING.fullProject),
    level: "L2 Review",
    source: "CPG Land Sales",
    asOf: "2026-07-05",
  },
  {
    claim: "Lots 2–4 bundle",
    value: formatUsd(CPG_PRICING.lots234Bundle),
    level: "L2 Review",
    source: "CPG Land Sales · 81.74 ac contiguous",
    asOf: "2026-07-05",
  },
  {
    claim: "Remaining 9 lots",
    value: formatUsd(CPG_PRICING.remaining9Lots),
    level: "L2 Review",
    source: "CPG Land Sales",
    asOf: "2026-07-05",
  },
  {
    claim: "Phase I ESA",
    value: "Complete · clean",
    level: "L2 Review",
    source: "Environmental report on file",
    asOf: "2026-06-01",
  },
  {
    claim: "Lot 4 MLS",
    value: "Live · Blanchard OK",
    level: "L2 Review",
    source: "Zillow / MLS",
    asOf: "2026-07-05",
  },
] as const;

export const CPG_PROOF = [
  { label: "Contact Gabriel Corrales", desc: "CPG Land Sales — acquisition inquiries", href: CPG_PARTNER.website },
  { label: "Lot 4 on MLS", desc: "Live listing · Blanchard, OK", href: CPG_ASSET.lot4Mls },
  { label: "Interactive parcel map", desc: "Full tract layout", href: CPG_ASSET.idLandMap },
  { label: "Abraxas verify record", desc: "Public registry · ABX-RE-LAND-006", href: `/verify/${encodeURIComponent(CPG_ASSET.id)}` },
] as const;

export const CPG_SURVEY_FILES: { lot: number; acres: number; label: string; href: string }[] = [
  { lot: 0, acres: 270, label: "Parent parcel plat (updated)", href: "/assets/cpg/surveys/Original_Property_Survey_Plat_UPDATED__1__ae94.pdf" },
  { lot: 0, acres: 0, label: "Warranty deed", href: "/assets/cpg/surveys/Warranty_Deed_Grady_270_d0fe.pdf" },
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
  "Multi-lot Oklahoma land on Abraxas with drone footage, surveys, and live pricing — the proof model scales beyond hospitality.",
  "Verify-once diligence: lenders and bulk buyers check one record instead of chasing plat PDFs through a chain.",
  "Real retail traction before full MLS — contracts at asking price validate the market, not a spreadsheet.",
  "CPG Land Sales + Abraxas = seller execution plus verified counterparty infrastructure.",
] as const;
