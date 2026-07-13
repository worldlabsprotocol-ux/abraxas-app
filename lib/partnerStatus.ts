// FILE: lib/partnerStatus.ts
// Real partner records — status buckets confirmed per partner before public naming.

export type PartnerStatusBucket = "closed" | "final_execution" | "pipeline";

export const PARTNER_NAME_PLACEHOLDER = "[REAL PARTNER NAME]";

export interface RealPartnerRecord {
  id: string;
  /** Approved public name — see TODO_PARTNER_ASSETS.md */
  publicName: string;
  statusBucket: PartnerStatusBucket;
  vertical: string;
  /** Accurate description for the confirmed bucket only */
  summary: string;
  /** Shown when public name is not yet approved */
  verticalHeadline: string;
  proofLabel: string;
  proofHref: string;
}

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

export const REAL_PARTNERS: RealPartnerRecord[] = [
  {
    id: "relying-party-hospitality-1",
    publicName: PARTNER_NAME_PLACEHOLDER,
    statusBucket: "closed",
    vertical: "Hospitality",
    verticalHeadline: "Short-term rental operator",
    summary: "Onboarded — reusable guest verification live via Cielo Sunrise. Book, verify, and settle USDC on Sui today.",
    proofLabel: "See Cielo reference loop",
    proofHref: "/case-studies/cielo",
  },
  {
    id: "relying-party-land-ok-1",
    publicName: "CPG Land Sales",
    statusBucket: "closed",
    vertical: "Land development · Oklahoma",
    verticalHeadline: "Oklahoma land development partner",
    summary: `Live — ${CPG_ASSET.name} (~270 ac, 11 lots · Grady County). Surveys, Phase I clean, contracts at asking. Verify-once sharing for bulk buyers and lenders.`,
    proofLabel: `${CPG_ASSET.name} case study`,
    proofHref: "/case-studies/cpg-grady-270",
  },
  {
    id: "relying-party-tribal-1",
    publicName: PARTNER_NAME_PLACEHOLDER,
    statusBucket: "closed",
    vertical: "Tribal land & mineral rights",
    verticalHeadline: "Land & mineral development partner",
    summary: "Onboarded — owner portal intake, verify-once sharing, and USDC settlement rail for high-stakes land workflows.",
    proofLabel: "Owner portal",
    proofHref: "/portal",
  },
];

export function isPartnerNamePublic(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed !== PARTNER_NAME_PLACEHOLDER;
}

/** Public-safe display — never renders bracket placeholders. */
export function partnerDisplayName(p: RealPartnerRecord): string {
  return isPartnerNamePublic(p.publicName) ? p.publicName : p.verticalHeadline;
}

export function partnerDisplaySubtitle(p: RealPartnerRecord): string | null {
  if (isPartnerNamePublic(p.publicName)) return p.vertical;
  if (p.statusBucket === "closed") return `${p.vertical} · active on Abraxas`;
  return `${p.vertical} · name publishing on partner approval`;
}

export function partnerStatusLabel(bucket: PartnerStatusBucket): string {
  switch (bucket) {
    case "closed":
      return "Active partner";
    case "final_execution":
      return "In final onboarding";
    case "pipeline":
      return "In discussion";
  }
}

export function partnersInExecutionCount(): number {
  return REAL_PARTNERS.filter(p => p.statusBucket === "closed" || p.statusBucket === "final_execution").length;
}

export function partnersActiveCount(): number {
  return REAL_PARTNERS.filter(p => p.statusBucket === "closed").length;
}

export function partnersActiveLabel(): string {
  const n = partnersActiveCount();
  if (n === 0) return "Design partners onboarding";
  return `${n} active design partner${n === 1 ? "" : "s"}`;
}
