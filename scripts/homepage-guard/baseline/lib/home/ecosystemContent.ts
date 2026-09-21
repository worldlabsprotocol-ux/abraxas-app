// FILE: lib/home/ecosystemContent.ts
// Homepage ecosystem copy. Typography first, no decorative icons.

import { GOOD_TROUBLE_PROOF_LINE } from "@/lib/positioningStrategy";
import { PROTOCOL_PROOF_IMAGES, type ProtocolProofImage } from "@/lib/home/protocolProofMedia";
import { PUBLIC_FLOW_STATUS_LABEL, publicHomeFlowById, type PublicFlowStatus } from "@/lib/product/publicFlowManifest";

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
  status: PublicFlowStatus;
  statusLabel: string;
  actionLabel: string;
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
  { id: "cannabis", title: "Cannabis", summary: "21+ eligibility and identity" },
  { id: "real-estate", title: "Real Estate", summary: "Ownership and property verification" },
  { id: "digital-assets", title: "Digital Assets", summary: "Wallet-linked credentials" },
  { id: "finance", title: "Financial Services", summary: "Reusable compliance" },
] as const;

export const PROTOCOL_IN_ACTION_PROOFS: ProtocolProof[] = [
  {
    id: "good-trouble",
    category: "Sandbox example",
    title: "Good Trouble",
    summary: publicHomeFlowById("good-trouble")!.summary,
    demonstrates: GOOD_TROUBLE_PROOF_LINE,
    href: "/good-trouble",
    image: PROTOCOL_PROOF_IMAGES["good-trouble"],
    status: "sandbox",
    statusLabel: PUBLIC_FLOW_STATUS_LABEL.sandbox,
    actionLabel: publicHomeFlowById("good-trouble")!.actionLabel,
  },
  {
    id: "cielo",
    category: "Registry record",
    title: "Cielo Sunrise",
    summary: publicHomeFlowById("cielo-registry")!.summary,
    demonstrates: "A genesis asset dossier. Not a bookable stay and not a USDC payment.",
    href: "/flagship",
    image: PROTOCOL_PROOF_IMAGES.cielo,
    status: "planned",
    statusLabel: PUBLIC_FLOW_STATUS_LABEL.planned,
    actionLabel: publicHomeFlowById("cielo-registry")!.actionLabel,
  },
  {
    id: "chickasaw",
    category: "Case study",
    title: "Chickasaw Project",
    summary: publicHomeFlowById("chickasaw")!.summary,
    demonstrates: "Diligence narrative for conventional property verification. Not a live transaction.",
    href: "/case-studies/chickasaw-project",
    image: PROTOCOL_PROOF_IMAGES.chickasaw,
    status: "planned",
    statusLabel: PUBLIC_FLOW_STATUS_LABEL.planned,
    actionLabel: publicHomeFlowById("chickasaw")!.actionLabel,
  },
];

export const PROTOCOL_PASSPORT_CONNECTOR: ProtocolConnector = {
  title: "Abraxas Passport",
  summary: "Reusable eligibility, not a public identity file",
  demonstrates: "Open Passport to prove only the result a service needs.",
  href: "/passport",
};
