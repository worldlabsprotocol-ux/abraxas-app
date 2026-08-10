// FILE: lib/home/ecosystemContent.ts
// Homepage ecosystem copy. Typography first, no decorative icons.

import { GOOD_TROUBLE_PROOF_LINE } from "@/lib/positioningStrategy";
import { PROTOCOL_PROOF_IMAGES, type ProtocolProofImage } from "@/lib/home/protocolProofMedia";

export interface IndustryCard {
  id: string;
  title: string;
  problem: string;
}

export interface ProtocolProof {
  id: string;
  category: string;
  title: string;
  summary: string;
  demonstrates: string;
  href: string;
  image: ProtocolProofImage;
}

export interface ProtocolConnector {
  title: string;
  summary: string;
  demonstrates: string;
  href: string;
}

export const WITHOUT_ABRAXAS_INDUSTRIES: IndustryCard[] = [
  { id: "cannabis", title: "Cannabis", problem: "Verify 21+ every visit" },
  { id: "real-estate", title: "Real Estate", problem: "Repeat ownership and identity checks" },
  { id: "exchanges", title: "Exchanges", problem: "Complete KYC again" },
  { id: "finance", title: "Financial Services", problem: "Repeat compliance onboarding" },
];

export const WITH_ABRAXAS_INDUSTRIES: IndustryCard[] = [
  { id: "cannabis", title: "Cannabis", problem: "Reusable 21+ eligibility" },
  { id: "real-estate", title: "Real Estate", problem: "Portable ownership proof" },
  { id: "exchanges", title: "Exchanges", problem: "Trusted KYC credential" },
  { id: "finance", title: "Finance", problem: "Portable compliance" },
];

export const REGULATED_INDUSTRY_PILLARS = [
  { id: "age-gated", title: "Age-gated commerce", summary: "Signed age and eligibility answers designed for gated checkout" },
  { id: "gaming", title: "Gaming and wagering", summary: "Jurisdiction and age policy checks at decision time" },
  { id: "finance", title: "Financial applications", summary: "Reusable eligibility proof for onboarding and access" },
  { id: "rwa", title: "Tokenized real-world assets", summary: "Ownership and eligibility proof for asset workflows" },
  { id: "marketplaces", title: "Digital marketplaces", summary: "Permissioned access with minimum necessary disclosure" },
] as const;

export const PROTOCOL_IN_ACTION_PROOFS: ProtocolProof[] = [
  {
    id: "cielo",
    category: "Genesis Asset",
    title: "Cielo Sunrise",
    summary: "Verified hospitality asset",
    demonstrates: "Real-world asset verification and registry.",
    href: "/flagship",
    image: PROTOCOL_PROOF_IMAGES.cielo,
  },
  {
    id: "chickasaw",
    category: "Traditional Markets",
    title: "Chickasaw Project",
    summary: "Property verification and buyer diligence",
    demonstrates: "Trust infrastructure for conventional transactions.",
    href: "/case-studies/chickasaw-project",
    image: PROTOCOL_PROOF_IMAGES.chickasaw,
  },
  {
    id: "good-trouble",
    category: "Reusable Credentials",
    title: "Good Trouble Canna",
    summary: "21+ eligibility verification",
    demonstrates: GOOD_TROUBLE_PROOF_LINE,
    href: "/good-trouble",
    image: PROTOCOL_PROOF_IMAGES["good-trouble"],
  },
];

export const PROTOCOL_PASSPORT_CONNECTOR: ProtocolConnector = {
  title: "Abraxas Passport",
  summary: "Portable identity credentials",
  demonstrates: "The reusable identity layer connecting every use case.",
  href: "/passport",
};
