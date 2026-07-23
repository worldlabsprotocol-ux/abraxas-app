// FILE: lib/data/exploreAssets.ts
// Real assets surfaced in the redesigned Verified Assets Explorer.
// Numbers/facts are sourced from existing data (flagshipProperty.ts,
// CloveCaseStudy, AssetGrid). No fabricated figures. Verification state
// is honest per asset.

import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
import { CIELO_REGISTRY_IMAGE } from "@/lib/data/registryAssetImages";
import { NAJ_TULUM_REGISTRY_IMAGE } from "@/lib/data/najTulumMedia";
import { SMYRNA_TOWNHOME_IMAGE } from "@/lib/data/registryAssetImages";
import { CPG_ASSET, CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";
import type { CapabilityStatus } from "@/lib/capabilityStatus";
import type { AssuranceLevel } from "@/lib/assuranceTaxonomy";

export type VerifyState = "verified" | "reference" | "open" | "owned" | "listed";

export interface MetricMeta {
  level?: AssuranceLevel;
  type?: "appraised" | "projected" | "estimated" | "model" | "historical" | "reference";
  asOf?: string;
}

export interface ExploreAsset {
  id: string;
  name: string;
  assetClass: string;       // e.g. "Real Estate · Hospitality"
  location: string;
  image: string;            // public path
  primaryLabel: string;     // e.g. "Valuation"
  primaryValue: string;     // e.g. "$1,100,000"
  secondaryLabel: string;   // e.g. "Cash yield"
  secondaryValue: string;   // e.g. "14.6%"
  primaryMeta?: MetricMeta;
  secondaryMeta?: MetricMeta;
  score?: string;           // collateral score "96"
  state: VerifyState;
  statusBadge?: CapabilityStatus;
  note?: string;            // honesty caveat
  href?: string;            // detail/reference link
  external?: boolean;       // open href in a new tab
  liveProof?: { label: string; url: string };  // e.g. Airbnb listing
  verificationScopeHref?: string;
  offeringDisclaimer?: boolean;
  cta: string;
}

export const EXPLORE_ASSETS: ExploreAsset[] = [
  {
    id: "genesis-asset",
    name: "Cielo Sunrise",
    assetClass: "Real Estate · Hospitality",
    location: "Mineral Bluff, Georgia",
    image: CIELO_REGISTRY_IMAGE.src,
    primaryLabel: "Appraised value",
    primaryValue: "$1,100,000",
    primaryMeta: { level: 3, type: "appraised", asOf: "2025-12-01" },
    secondaryLabel: "Cash yield",
    secondaryValue: "14.6%",
    secondaryMeta: { level: 1, type: "projected", asOf: "2026-01-15" },
    score: "96",
    state: "verified",
    statusBadge: undefined,
    href: "/flagship",
    verificationScopeHref: "/flagship#verification-scope",
    offeringDisclaimer: true,
    liveProof: { label: "Live on Airbnb", url: CIELO_AIRBNB_URL },
    cta: "View asset",
  },
  {
    id: "chickasaw-project",
    name: CPG_ASSET.name,
    assetClass: "Real Estate · Land",
    location: CPG_ASSET.location,
    image: CPG_ASSET.image,
    primaryLabel: "Full project",
    primaryValue: formatUsd(CPG_PRICING.fullProject),
    primaryMeta: { level: 2, type: "reference", asOf: "2026-07-05" },
    secondaryLabel: "Acreage",
    secondaryValue: "~270 ac · 11 lots",
    secondaryMeta: { level: 2, type: "reference", asOf: "2026-07-05" },
    state: "open",
    statusBadge: undefined,
    note: "Phase I clean · surveys on file · qualified buyer workflow via Abraxas",
    href: CPG_ASSET.caseStudyPath,
    liveProof: { label: "Verify record", url: "/verify/ABX-RE-LAND-006" },
    cta: "View case study",
  },
  {
    id: "smyrna-townhome",
    name: "Smyrna Townhome",
    assetClass: "Real Estate · Residential",
    location: "Smyrna, Georgia · Battery Atlanta",
    image: SMYRNA_TOWNHOME_IMAGE.src,
    primaryLabel: "Appreciation",
    primaryValue: "$76.2K → $228K+",
    primaryMeta: { level: 1, type: "historical", asOf: "2024-06-01" },
    secondaryLabel: "Rent estimate",
    secondaryValue: "$1,850 / mo",
    secondaryMeta: { level: 1, type: "estimated", asOf: "2026-01-01" },
    state: "open",
    offeringDisclaimer: true,
    note: "Clear title, paid off. Seeking a verified capital partner.",
    href: "/case-studies/smyrna",
    cta: "View case study",
  },
  {
    id: "naj-tulum",
    name: "Naj Tulum",
    assetClass: "Real Estate · International",
    location: "Aldea Zama, Tulum, Mexico",
    image: NAJ_TULUM_REGISTRY_IMAGE.src,
    primaryLabel: "Ownership",
    primaryValue: "Owned outright",
    secondaryLabel: "Monthly income",
    secondaryValue: "$1,500 / mo",
    state: "owned",
    note: "Held via fideicomiso. Acquired 2023. Not open to outside investors.",
    href: "/verify/ABX-RE-INT-003",
    cta: "View verify record",
  },
  {
    id: "the-clove",
    name: "The Clove",
    assetClass: "Real Estate · Villa",
    location: "Blu Pearl Development",
    image: "/assets/worldwearables/theclove.webp",
    primaryLabel: "Land / build",
    primaryValue: "179m² / 149m²",
    secondaryLabel: "Ref. ROI (dev.)",
    secondaryValue: "23.8–32%",
    secondaryMeta: { level: 1, type: "reference", asOf: "2023-01-01" },
    state: "reference",
    offeringDisclaimer: true,
    note: "Completed cycle, sold out. ROI is the developer's projection, not Abraxas-verified.",
    cta: "Verify to view",
  },
];

export const VERIFY_META: Record<VerifyState, { label: string; color: string }> = {
  verified:  { label: "AAS 1 Verified",      color: "#10B981" },
  open:      { label: "Open · Ownership clear", color: "#3B82F6" },
  owned:     { label: "Owned · Not open",    color: "#F59E0B" },
  reference: { label: "Reference · Completed", color: "#8B5CF6" },
  listed:    { label: "Owner listed · L1",   color: "#64748B" },
};
