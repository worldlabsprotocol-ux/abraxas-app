// FILE: lib/data/registryAssets.ts
// Canonical registry entries — maps explore catalog ↔ ABX IDs ↔ verifier responses.

import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_REGISTRY_IMAGE } from "@/lib/data/registryAssetImages";
import { SMYRNA_ASSET } from "@/lib/smyrnaCaseStudy";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { EXPLORE_ASSETS, type VerifyState } from "@/lib/data/exploreAssets";
import type { AssuranceBreakdown } from "@/lib/assuranceTaxonomy";

export interface RegistryAssetDef {
  abxId: string;
  slug: string;
  name: string;
  assetClass: string;
  location: string;
  image: string;
  verifyState: VerifyState;
  pipelineStage: string;
  assuranceLevel: number;
  assuranceTaxonomy: AssuranceBreakdown;
  metadataUri: string;
  notice: string;
  tokenization?: {
    standard: string;
    chain: string;
    status: string;
    supply?: number;
  };
  /** Aliases that resolve to this asset */
  aliases?: string[];
}

const CIELO: RegistryAssetDef = {
  abxId: FLAGSHIP_PROPERTY.id,
  slug: "genesis-asset",
  name: FLAGSHIP_PROPERTY.title,
  assetClass: FLAGSHIP_PROPERTY.assetClass,
  location: "Mineral Bluff, Georgia",
  image: CIELO_REGISTRY_IMAGE.src,
  verifyState: "verified",
  pipelineStage: "MARKETPLACE_LIVE",
  assuranceLevel: 3,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "VERIFIED", timestamp: "2025-11-01T00:00:00Z", provider: "Veriff_Biometric_IDV" },
    L2_LegalReview: { status: "VERIFIED", timestamp: "2025-11-15T00:00:00Z", provider: "Fannin_County_Deed_Review" },
    L3_ProfessionalAttestation: { status: "VERIFIED", timestamp: "2025-12-01T00:00:00Z", authority: "Independent_Appraisal_V5" },
    L4_ActiveMonitoring: { status: "ACTIVE", lastSync: new Date().toISOString(), oracleSource: "Airbnb_Listing_CrossCheck" },
  },
  metadataUri: "/flagship",
  notice:
    "Genesis pilot asset · collateral-eligible · Abraxas registry L1–L4. Yield figures are owner projections.",
  tokenization: {
    standard: "Sui Move Passport",
    chain: "Sui Devnet",
    status: "COLLATERAL_ELIGIBLE",
    supply: 1,
  },
  aliases: ["cielo", "cielo-sunrise", "genesis-asset"],
};

const SMYRNA: RegistryAssetDef = {
  abxId: SMYRNA_ASSET.id,
  slug: "smyrna-townhome",
  name: SMYRNA_ASSET.name,
  assetClass: "REAL_ESTATE_RESIDENTIAL",
  location: SMYRNA_ASSET.location,
  image: SMYRNA_ASSET.image,
  verifyState: "open",
  pipelineStage: "CAPITAL_PARTNER_OPEN",
  assuranceLevel: 2,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "VERIFIED", timestamp: "2024-06-01T00:00:00Z", provider: "Owner_Attestation" },
    L2_LegalReview: { status: "VERIFIED", timestamp: "2024-08-01T00:00:00Z", provider: "Title_Clearance_Review" },
    L3_ProfessionalAttestation: { status: "PENDING", timestamp: new Date().toISOString(), authority: "Independent_Appraisal" },
    L4_ActiveMonitoring: { status: "PENDING" },
  },
  metadataUri: "/case-studies/smyrna",
  notice:
    "Open for verified capital partner interest · clear title · not yet MARKETPLACE_LIVE. Metrics from public records and owner statements.",
  tokenization: {
    standard: "Abraxas Registry Entry",
    chain: "Sui (planned)",
    status: "PIPELINE_OPEN",
  },
  aliases: ["smyrna", "smyrna-townhome"],
};

const CPG_GRADY: RegistryAssetDef = {
  abxId: CPG_ASSET.id,
  slug: "cpg-grady-270",
  name: CPG_ASSET.name,
  assetClass: "REAL_ESTATE_LAND",
  location: CPG_ASSET.location,
  image: CPG_ASSET.image,
  verifyState: "open",
  pipelineStage: "LAND_PARTNER_ACTIVE",
  assuranceLevel: 2,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "VERIFIED", timestamp: "2026-07-05T00:00:00Z", provider: "CPG_Land_Sales" },
    L2_LegalReview: { status: "VERIFIED", timestamp: "2026-07-13T00:00:00Z", provider: "Survey_Plat_Phase_I" },
    L3_ProfessionalAttestation: { status: "PENDING", timestamp: new Date().toISOString(), authority: "Independent_Appraisal" },
    L4_ActiveMonitoring: { status: "PENDING" },
  },
  metadataUri: "/case-studies/cpg-grady-270",
  notice:
    "Active land listing · CPG Land Sales · ~270 ac Grady County OK. Surveys complete, Phase I clean, contracts at asking pre-MLS.",
  tokenization: {
    standard: "Abraxas Registry Entry",
    chain: "Off-chain title · Sui settlement rail (planned)",
    status: "LAND_PARTNER_ACTIVE",
  },
  aliases: ["cpg", "cpg-grady", "grady-270", "grady-county-270", "abx-re-land-006"],
};

const NAJ: RegistryAssetDef = {
  abxId: "ABX-RE-INT-003",
  slug: "naj-tulum",
  name: "Naj Tulum",
  assetClass: "REAL_ESTATE_INTERNATIONAL",
  location: "Aldea Zama, Tulum, Mexico",
  image: "/assets/worldwearables/naj.jpg",
  verifyState: "owned",
  pipelineStage: "OWNED_NOT_OPEN",
  assuranceLevel: 1,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "VERIFIED", provider: "Owner_Attestation" },
    L2_LegalReview: { status: "VERIFIED", provider: "Fideicomiso_Record" },
  },
  metadataUri: "/assets/naj-tulum",
  notice: "Owned outright via fideicomiso · not open to outside investors · registry reference only.",
  tokenization: {
    standard: "Reference entry",
    chain: "Off-chain title",
    status: "OWNED",
  },
  aliases: ["naj", "naj-tulum"],
};

const DEMO_EXTERNAL: RegistryAssetDef = {
  abxId: "ABX-DEMO-LAND-001",
  slug: "demo-riverside-parcel",
  name: "Sample Riverside Parcel (DEMO)",
  assetClass: "REAL_ESTATE_LAND",
  location: "Lane County, Oregon",
  image: "/assets/worldwearables/naj.jpg",
  verifyState: "reference",
  pipelineStage: "DEMO_SAMPLE",
  assuranceLevel: 0,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "PENDING", provider: "Pending_review" },
  },
  metadataUri: "/integrations/external-assets",
  notice:
    "DEMO / SAMPLE — illustrates external asset owner intake. Not verified. Status Pending review until named reviewer signs.",
  tokenization: {
    standard: "Reference entry",
    chain: "Off-chain",
    status: "DEMO_SAMPLE",
  },
  aliases: ["demo-land", "abx-demo-land-001"],
};

const CLOVE: RegistryAssetDef = {
  abxId: "ABX-RE-VIL-004",
  slug: "the-clove",
  name: "The Clove",
  assetClass: "REAL_ESTATE_VILLA",
  location: "Blu Pearl Development",
  image: "/assets/worldwearables/theclove.webp",
  verifyState: "reference",
  pipelineStage: "REFERENCE_COMPLETED",
  assuranceLevel: 1,
  assuranceTaxonomy: {
    L1_IdentityClaim: { status: "REFERENCE", provider: "Developer_Projection" },
    L2_LegalReview: { status: "REFERENCE", provider: "Completed_Cycle" },
  },
  metadataUri: "/assets/the-clove",
  notice: "Completed developer cycle · sold out · ROI figures are developer projections, not Abraxas-verified yields.",
  tokenization: {
    standard: "Reference entry",
    chain: "Off-chain",
    status: "COMPLETED_REFERENCE",
  },
  aliases: ["clove", "the-clove"],
};

export const REGISTRY_ASSETS: RegistryAssetDef[] = [CIELO, CPG_GRADY, SMYRNA, NAJ, DEMO_EXTERNAL, CLOVE];

const BY_KEY = new Map<string, RegistryAssetDef>();
for (const asset of REGISTRY_ASSETS) {
  BY_KEY.set(asset.abxId.toLowerCase(), asset);
  BY_KEY.set(asset.slug.toLowerCase(), asset);
  for (const alias of asset.aliases ?? []) {
    BY_KEY.set(alias.toLowerCase(), asset);
  }
}

export function resolveRegistryAsset(query: string): RegistryAssetDef | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (BY_KEY.has(q)) return BY_KEY.get(q)!;
  if (/^abx-/i.test(q)) {
    return BY_KEY.get(q) ?? null;
  }
  return null;
}

/** Enrich explore assets with verify links where ABX IDs exist */
export function getExploreAssetVerifyQuery(exploreId: string): string | null {
  const match = REGISTRY_ASSETS.find(a => a.slug === exploreId);
  return match?.abxId ?? null;
}

export function registryAssetsForShowcase() {
  return REGISTRY_ASSETS.map(asset => {
    const explore = EXPLORE_ASSETS.find(e => e.id === asset.slug);
    return {
      ...asset,
      primaryLabel: explore?.primaryLabel,
      primaryValue: explore?.primaryValue,
      secondaryLabel: explore?.secondaryLabel,
      secondaryValue: explore?.secondaryValue,
      statusBadge: explore?.statusBadge,
      note: explore?.note,
      href: explore?.href ?? asset.metadataUri,
    };
  });
}
