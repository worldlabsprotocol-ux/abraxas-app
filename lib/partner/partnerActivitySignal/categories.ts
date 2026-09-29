// FILE: lib/partner/partnerActivitySignal/categories.ts
// Effective activity categories = system ∩ policy-pack ∩ partner configuration.

import type { PolicyPack } from "@/lib/partner/launchpad/policyPacks";
import {
  PARTNER_ACTIVITY_SIGNAL_TYPES,
  isPartnerActivitySignalType,
  type PartnerActivitySignalType,
} from "./contract";

export function packActivityCategories(
  pack: Pick<PolicyPack, "allowed_activity_categories"> | null | undefined,
): readonly PartnerActivitySignalType[] {
  if (!pack?.allowed_activity_categories?.length) return [];
  return pack.allowed_activity_categories.filter(isPartnerActivitySignalType);
}

export function resolveEffectiveActivityCategories(input: {
  packCategories?: readonly string[] | null;
  partnerCategories: readonly string[];
}): PartnerActivitySignalType[] {
  const system = new Set<string>(PARTNER_ACTIVITY_SIGNAL_TYPES);
  const partner = input.partnerCategories.filter(
    (category): category is PartnerActivitySignalType =>
      isPartnerActivitySignalType(category) && system.has(category),
  );
  const packList = (input.packCategories ?? []).filter(
    (category): category is PartnerActivitySignalType =>
      isPartnerActivitySignalType(category) && system.has(category),
  );
  if (packList.length === 0) return [];
  const packSet = new Set<string>(packList);
  return partner.filter((category) => packSet.has(category));
}

export function activityCategoriesForPack(
  pack: Pick<PolicyPack, "allowed_activity_categories"> | null | undefined,
  partnerCategories: readonly string[],
): PartnerActivitySignalType[] {
  return resolveEffectiveActivityCategories({
    packCategories: packActivityCategories(pack),
    partnerCategories,
  });
}
