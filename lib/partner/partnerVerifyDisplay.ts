// FILE: lib/partner/partnerVerifyDisplay.ts
// Human-readable partner verification copy for institutional UI.

import { GOOD_TROUBLE_BRAND, GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

const PARTNER_LABELS: Record<string, { name: string; returnLabel: string }> = {
  [GOOD_TROUBLE_PARTNER_ID]: {
    name: GOOD_TROUBLE_BRAND.name,
    returnLabel: `Return to ${GOOD_TROUBLE_BRAND.name}`,
  },
};

const POLICY_REQUIREMENTS: Record<string, string> = {
  [GOOD_TROUBLE_RETAIL_POLICY_ID]: "Confirm eligibility for the requested 21+ policy",
};

export function resolvePartnerDisplayName(partnerId: string): string {
  return PARTNER_LABELS[partnerId]?.name ?? "Partner";
}

export function resolvePartnerReturnLabel(partnerId: string): string {
  return PARTNER_LABELS[partnerId]?.returnLabel ?? "Return to partner";
}

export function resolvePolicyRequirement(policyId: string, permissionLabel?: string | null): string {
  if (permissionLabel) return permissionLabel;
  return POLICY_REQUIREMENTS[policyId] ?? "Confirm eligibility for the requested policy";
}

export function resolvePartnerHomeUrl(partnerId: string): string | null {
  if (partnerId === GOOD_TROUBLE_PARTNER_ID) return GOOD_TROUBLE_BRAND.website;
  return null;
}
