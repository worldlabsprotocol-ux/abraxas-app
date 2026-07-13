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

export const REAL_PARTNERS: RealPartnerRecord[] = [
  {
    id: "relying-party-hospitality-1",
    publicName: PARTNER_NAME_PLACEHOLDER,
    statusBucket: "final_execution",
    vertical: "Hospitality",
    verticalHeadline: "Short-term rental operator",
    summary: "Final onboarding — reusable guest verification for high-frequency booking workflows. Cielo Sunrise is the reference loop.",
    proofLabel: "See Cielo reference loop",
    proofHref: "/case-studies/cielo",
  },
  {
    id: "relying-party-tribal-1",
    publicName: PARTNER_NAME_PLACEHOLDER,
    statusBucket: "final_execution",
    vertical: "Tribal land & mineral rights",
    verticalHeadline: "Land & mineral development partner",
    summary: "Final execution — verify once for tribal land and mineral workflows. Owner portal intake live today.",
    proofLabel: "Owner portal intake",
    proofHref: "/portal/apply",
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
  return `${p.vertical} · name publishing on partner approval`;
}

export function partnerStatusLabel(bucket: PartnerStatusBucket): string {
  switch (bucket) {
    case "closed":
      return "In production";
    case "final_execution":
      return "In final onboarding";
    case "pipeline":
      return "In discussion";
  }
}

export function partnersInExecutionCount(): number {
  return REAL_PARTNERS.filter(p => p.statusBucket === "closed" || p.statusBucket === "final_execution").length;
}
