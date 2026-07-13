// FILE: lib/partnerStatus.ts
// Real partner records — status buckets confirmed per partner before public naming.

export type PartnerStatusBucket = "closed" | "final_execution" | "pipeline";

export interface RealPartnerRecord {
  id: string;
  /** Replace with approved public name — see TODO_PARTNER_ASSETS.md */
  publicName: string;
  statusBucket: PartnerStatusBucket;
  vertical: string;
  /** Accurate description for the confirmed bucket only */
  summary: string;
}

/** Placeholder until each partner confirms public-use approval and status bucket. */
export const REAL_PARTNERS: RealPartnerRecord[] = [
  {
    id: "relying-party-hospitality-1",
    publicName: "[REAL PARTNER NAME]",
    statusBucket: "final_execution",
    vertical: "Hospitality",
    summary: "Onboarding in final stages — reusable guest verification for short-term rental workflows.",
  },
  {
    id: "relying-party-tribal-1",
    publicName: "[REAL PARTNER NAME]",
    statusBucket: "final_execution",
    vertical: "Tribal land & mineral rights",
    summary: "Design partnership in final execution — document reuse for high-stakes land and mineral workflows.",
  },
];

export function partnerStatusLabel(bucket: PartnerStatusBucket): string {
  switch (bucket) {
    case "closed":
      return "In production";
    case "final_execution":
      return "Final onboarding";
    case "pipeline":
      return "In discussion";
  }
}

export function partnersInExecutionCount(): number {
  return REAL_PARTNERS.filter(p => p.statusBucket === "closed" || p.statusBucket === "final_execution").length;
}
