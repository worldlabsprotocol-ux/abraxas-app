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

export interface ProtocolProof {
  id: string;
  category: string;
  icon: string;
  title: string;
  summary: string;
  demonstrates: string;
  href: string;
}

export interface ProtocolConnector {
  icon: string;
  title: string;
  summary: string;
  demonstrates: string;
  href: string;
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
    id: "cielo",
    icon: "🌅",
    title: "Cielo Sunrise",
    summary: "Genesis verified asset · hospitality",
    href: "/flagship",
    status: "live",
  },
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
    icon: "🛂",
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

/** Three proofs that the protocol works in different domains — shown in progression order. */
export const PROTOCOL_IN_ACTION_PROOFS: ProtocolProof[] = [
  {
    id: "cielo",
    category: "Genesis Asset",
    icon: "🌅",
    title: "Cielo Sunrise",
    summary: "Verified hospitality asset",
    demonstrates: "Real-world asset verification and registry.",
    href: "/flagship",
  },
  {
    id: "chickasaw",
    category: "Traditional Markets",
    icon: "🏡",
    title: "Chickasaw Project",
    summary: "Property verification and buyer diligence",
    demonstrates: "Trust infrastructure for conventional transactions.",
    href: "/case-studies/chickasaw-project",
  },
  {
    id: "good-trouble",
    category: "Reusable Credentials",
    icon: "🌿",
    title: "Good Trouble Canna",
    summary: "21+ eligibility verification",
    demonstrates: "Reusable compliance credentials across businesses. The first proof of portable eligibility.",
    href: "/good-trouble",
  },
];

export const PROTOCOL_PASSPORT_CONNECTOR: ProtocolConnector = {
  icon: "🛂",
  title: "Abraxas Passport",
  summary: "Portable identity credentials",
  demonstrates: "The reusable identity layer connecting every use case.",
  href: "/passport",
};
