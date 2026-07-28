// FILE: lib/home/ecosystemContent.ts
// Homepage ecosystem copy — industries, partners, verified assets.

export interface IndustryCard {
  id: string;
  icon: string;
  title: string;
  problem: string;
}

export interface EcosystemPartnerCard {
  id: string;
  icon: string;
  title: string;
  summary: string;
  href?: string;
  status?: "live" | "coming";
}

export const WITHOUT_ABRAXAS_INDUSTRIES: IndustryCard[] = [
  { id: "cannabis", icon: "🌿", title: "Cannabis", problem: "Verify 21+ every visit" },
  { id: "real-estate", icon: "🏡", title: "Real Estate", problem: "Repeat ownership & identity checks" },
  { id: "exchanges", icon: "💱", title: "Exchanges", problem: "Complete KYC again" },
  { id: "finance", icon: "🏛️", title: "Financial Services", problem: "Repeat compliance onboarding" },
];

export const WITH_ABRAXAS_INDUSTRIES: IndustryCard[] = [
  { id: "cannabis", icon: "🌿", title: "Cannabis", problem: "Reusable 21+ eligibility" },
  { id: "real-estate", icon: "🏡", title: "Real Estate", problem: "Portable ownership proof" },
  { id: "exchanges", icon: "💱", title: "Exchanges", problem: "Trusted KYC credential" },
  { id: "finance", icon: "🏛️", title: "Finance", problem: "Portable compliance" },
];

export const REGULATED_INDUSTRY_PILLARS = [
  { id: "cannabis", icon: "🌿", title: "Cannabis", summary: "21+ eligibility and identity" },
  { id: "real-estate", icon: "🏡", title: "Real Estate", summary: "Ownership and property verification" },
  { id: "digital-assets", icon: "🔗", title: "Digital Assets", summary: "Wallet-linked credentials" },
  { id: "finance", icon: "🏛️", title: "Financial Services", summary: "Reusable compliance" },
] as const;

export const LIVE_ECOSYSTEM_PARTNERS: EcosystemPartnerCard[] = [
  {
    id: "good-trouble",
    icon: "🌿",
    title: "Good Trouble Canna",
    summary: "Reusable 21+ eligibility",
    href: "/good-trouble",
    status: "live",
  },
  {
    id: "chickasaw",
    icon: "🏡",
    title: "Chickasaw Project",
    summary: "Property verification",
    href: "/case-studies/chickasaw-project",
    status: "live",
  },
  {
    id: "passport",
    icon: "🆔",
    title: "Abraxas Passport",
    summary: "Portable identity credential",
    href: "/passport",
    status: "live",
  },
  {
    id: "more",
    icon: "➕",
    title: "More integrations coming",
    summary: "Design partners onboarding now",
    href: "/design-partner",
    status: "coming",
  },
];

export const VERIFIED_ASSET_CARDS: EcosystemPartnerCard[] = [
  {
    id: "gt-asset",
    icon: "🌿",
    title: "Good Trouble Canna",
    summary: "Age verification",
    href: "/good-trouble",
    status: "live",
  },
  {
    id: "land-asset",
    icon: "🏡",
    title: "Chickasaw Project",
    summary: "Property verification",
    href: "/verify/ABX-RE-LAND-006",
    status: "live",
  },
  {
    id: "more-assets",
    icon: "🔜",
    title: "More partners coming online",
    summary: "Verified across regulated industries",
    href: "/verify",
    status: "coming",
  },
];
