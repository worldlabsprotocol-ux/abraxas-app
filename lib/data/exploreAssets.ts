// FILE: lib/data/exploreAssets.ts
// Real assets surfaced in the redesigned Verified Assets Explorer.
// Numbers/facts are sourced from existing data (flagshipProperty.ts,
// CloveCaseStudy, AssetGrid). No fabricated figures. Verification state
// is honest per asset.

import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";

export type VerifyState = "verified" | "reference" | "open" | "owned";

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
  score?: string;           // collateral score "96"
  state: VerifyState;
  note?: string;            // honesty caveat
  href?: string;            // detail/reference link
  external?: boolean;       // open href in a new tab
  liveProof?: { label: string; url: string };  // e.g. Airbnb listing
  cta: string;
}

export const EXPLORE_ASSETS: ExploreAsset[] = [
  {
    id: "genesis-asset",
    name: "Cielo Sunrise",
    assetClass: "Real Estate · Hospitality",
    location: "Mineral Bluff, Georgia",
    image: "/assets/cielo/01.jpg",
    primaryLabel: "Appraised value",
    primaryValue: "$1,100,000",
    secondaryLabel: "Cash yield",
    secondaryValue: "14.6%",
    score: "96",
    state: "verified",
    href: "/flagship",
    liveProof: { label: "Live on Airbnb", url: CIELO_AIRBNB_URL },
    cta: "View asset",
  },
  {
    id: "smyrna-townhome",
    name: "Smyrna Townhome",
    assetClass: "Real Estate · Residential",
    location: "Smyrna, Georgia · Battery Atlanta",
    image: "/assets/smyrna/011.webp",
    primaryLabel: "Appreciation",
    primaryValue: "$76.2K → $228K+",
    secondaryLabel: "Rent estimate",
    secondaryValue: "$1,850 / mo",
    state: "open",
    note: "Clear title, paid off. Seeking a verified capital partner.",
    cta: "Inquire",
  },
  {
    id: "naj-tulum",
    name: "Naj Tulum",
    assetClass: "Real Estate · International",
    location: "Aldea Zama, Tulum, Mexico",
    image: "/assets/worldwearables/naj.jpg",
    primaryLabel: "Ownership",
    primaryValue: "Owned outright",
    secondaryLabel: "Monthly income",
    secondaryValue: "$1,500 / mo",
    state: "owned",
    note: "Held via fideicomiso. Not open to outside investors.",
    cta: "Verify to view",
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
    state: "reference",
    note: "Completed cycle, sold out. ROI is the developer's projection, not Abraxas-verified.",
    cta: "Verify to view",
  },
];

export const VERIFY_META: Record<VerifyState, { label: string; color: string }> = {
  verified:  { label: "AAS-1 Verified",      color: "#10B981" },
  open:      { label: "Open · Ownership clear", color: "#3B82F6" },
  owned:     { label: "Owned · Not open",    color: "#F59E0B" },
  reference: { label: "Reference · Completed", color: "#8B5CF6" },
};
