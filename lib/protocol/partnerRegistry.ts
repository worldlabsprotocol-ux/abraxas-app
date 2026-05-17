// FILE: lib/protocol/partnerRegistry.ts
// Authorized verification partner registry.
// Partners are credentialed and can co-sign on-chain state transitions.
// New partners require governance approval before activation.

import { VerificationPartnerType, RegionalJurisdiction } from "./assetClasses";

export interface VerificationPartner {
  id:            string;
  name:          string;
  type:          VerificationPartnerType;
  jurisdictions: RegionalJurisdiction[];
  assetClasses:  string[];
  website?:      string;
  credentials:   string[];
  active:        boolean;
  walletAddress?: string;   // Solana wallet for on-chain co-signing
  addedAt:       number;
  notes?:        string;
}

// ── Initial authorized partner set ───────────────────────────────────────────
export const PARTNER_REGISTRY: VerificationPartner[] = [

  // ── Tribal / BIA Authorities ─────────────────────────────────────────────
  {
    id:"CHITIMACHA_COUNCIL",
    name:"Chitimacha Tribe of Louisiana — Tribal Council",
    type:"TRIBAL_COUNCIL",
    jurisdictions:["LA_TRIBAL"],
    assetClasses:["Tribal Land Asset","Mineral Rights","Real Estate Parcel"],
    credentials:["Federally recognized tribe — 25 USC 479"],
    active:true,
    addedAt:1748000000000,
    notes:"Charenton, Louisiana. Cypress Bayou Casino sovereignty.",
  },
  {
    id:"COUSHATTA_COUNCIL",
    name:"Coushatta Tribe of Louisiana — Tribal Council",
    type:"TRIBAL_COUNCIL",
    jurisdictions:["LA_TRIBAL"],
    assetClasses:["Tribal Land Asset","Mineral Rights","Real Estate Parcel"],
    credentials:["Federally recognized tribe — 25 USC 479"],
    active:true,
    addedAt:1748000000000,
    notes:"Elton, Louisiana. Grand Casino Coushatta sovereignty.",
  },
  {
    id:"CHEROKEE_NATION",
    name:"Cherokee Nation — Land Management Authority",
    type:"TRIBAL_COUNCIL",
    jurisdictions:["OK_TRIBAL"],
    assetClasses:["Tribal Land Asset","Mineral Rights","Real Estate Parcel"],
    credentials:["Federally recognized tribe","Largest tribal nation in US"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"OSAGE_NATION",
    name:"Osage Nation — Minerals Council",
    type:"TRIBAL_COUNCIL",
    jurisdictions:["OK_TRIBAL"],
    assetClasses:["Mineral Rights","Tribal Land Asset"],
    credentials:["Federally recognized","Osage minerals jurisdiction"],
    active:true,
    addedAt:1748000000000,
    notes:"Unique mineral rights structure — Osage Nation holds headright mineral estate over Osage County, Oklahoma.",
  },
  {
    id:"BIA_WESTERN_OK",
    name:"Bureau of Indian Affairs — Western Oklahoma Agency",
    type:"BIA_AUTHORITY",
    jurisdictions:["OK_TRIBAL","FEDERAL_BIA"],
    assetClasses:["Tribal Land Asset","Mineral Rights","Real Estate Parcel"],
    credentials:["Federal authority — 25 CFR Part 162"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"BIA_SOUTHERN",
    name:"Bureau of Indian Affairs — Southern Plains Regional Office",
    type:"BIA_AUTHORITY",
    jurisdictions:["LA_TRIBAL","OK_TRIBAL","FEDERAL_BIA"],
    assetClasses:["Tribal Land Asset","Mineral Rights"],
    credentials:["Federal authority — 25 CFR"],
    active:true,
    addedAt:1748000000000,
  },

  // ── Title Companies ──────────────────────────────────────────────────────
  {
    id:"FIDELITY_NATIONAL",
    name:"Fidelity National Title Group",
    type:"TITLE_COMPANY",
    jurisdictions:["US_STANDARD","LA_TRIBAL","OK_TRIBAL"],
    assetClasses:["Mineral Rights","Real Estate Parcel"],
    credentials:["ALTA member","Licensed in all 50 states"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"FIRST_AMERICAN",
    name:"First American Title Insurance Company",
    type:"TITLE_COMPANY",
    jurisdictions:["US_STANDARD","LA_TRIBAL","OK_TRIBAL"],
    assetClasses:["Mineral Rights","Real Estate Parcel"],
    credentials:["ALTA member","NYSE: FAF","Licensed nationwide"],
    active:true,
    addedAt:1748000000000,
  },

  // ── Certified Appraisers ─────────────────────────────────────────────────
  {
    id:"MAI_NETWORK",
    name:"MAI Certified Appraisers Network",
    type:"CERTIFIED_APPRAISER",
    jurisdictions:["US_STANDARD"],
    assetClasses:["Real Estate Parcel","Tribal Land Asset"],
    credentials:["MAI designation — Appraisal Institute","USPAP certified"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"PETROLEUM_APPRAISER_ASSOC",
    name:"American Society of Petroleum Engineers — Valuation Committee",
    type:"PETROLEUM_ENGINEER",
    jurisdictions:["US_STANDARD","LA_TRIBAL","OK_TRIBAL"],
    assetClasses:["Mineral Rights"],
    credentials:["SPE-PRMS certified","SEC reserve reporting qualified"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"BARRETT_JACKSON",
    name:"Barrett-Jackson Auction Company — Appraisal Division",
    type:"AUCTION_HOUSE",
    jurisdictions:["US_STANDARD"],
    assetClasses:["Collectible Automobile"],
    credentials:["Premier collector car auction house","40+ years market data"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"RM_SOTHEBYS",
    name:"RM Sotheby's",
    type:"AUCTION_HOUSE",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Collectible Automobile","Fine Art"],
    credentials:["Leading collector car and art auction house"],
    active:true,
    addedAt:1748000000000,
  },

  // ── Grading Services ─────────────────────────────────────────────────────
  {
    id:"CGC",
    name:"Certified Guaranty Company (CGC)",
    type:"GRADING_SERVICE",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Rare Comic"],
    credentials:["Industry standard comic grading","Registry verified"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"PSA",
    name:"Professional Sports Authenticator (PSA)",
    type:"GRADING_SERVICE",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Graded Card"],
    credentials:["Industry leader trading card grading"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"BGS",
    name:"Beckett Grading Services (BGS)",
    type:"GRADING_SERVICE",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Graded Card"],
    credentials:["Premium grading — subgrade system"],
    active:true,
    addedAt:1748000000000,
  },

  // ── Custody Vaults ───────────────────────────────────────────────────────
  {
    id:"BRINKS_VAULT",
    name:"Brink's Company — Vault Services",
    type:"CUSTODY_VAULT",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Fine Metals","Luxury Watch","Fine Spirits","Graded Card","Rare Comic"],
    credentials:["NYSE: BCO","ISO 9001 certified","Full insurance coverage"],
    active:true,
    addedAt:1748000000000,
  },
  {
    id:"LOOMIS_VAULT",
    name:"Loomis International — Collector Asset Vault",
    type:"CUSTODY_VAULT",
    jurisdictions:["US_STANDARD","INTERNATIONAL"],
    assetClasses:["Fine Metals","Luxury Watch","Collectible Automobile"],
    credentials:["ISO certified","Specialized collector storage"],
    active:true,
    addedAt:1748000000000,
  },
];

export function getPartnersByType(type: VerificationPartnerType): VerificationPartner[] {
  return PARTNER_REGISTRY.filter(p => p.type === type && p.active);
}

export function getPartnersByJurisdiction(j: RegionalJurisdiction): VerificationPartner[] {
  return PARTNER_REGISTRY.filter(p => p.jurisdictions.includes(j) && p.active);
}

export function getPartnerById(id: string): VerificationPartner | undefined {
  return PARTNER_REGISTRY.find(p => p.id === id);
}