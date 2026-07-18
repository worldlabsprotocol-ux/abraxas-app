// FILE: lib/partner/internalPartners.ts
// Partner IDs that do not count toward external relying-party proof.

import {
  LEGACY_SANDBOX_PARTNER_ID,
  SANDBOX_PARTNER_ID,
} from "@/lib/partner/sandboxPartner";

export const INTERNAL_PARTNER_IDS = new Set([
  SANDBOX_PARTNER_ID,
  LEGACY_SANDBOX_PARTNER_ID,
  "abraxas-pilot",
  "abraxas-internal",
  "unknown",
  "demo_relying_party",
]);

export function isExternalProductionPartner(partnerId: string | null | undefined): boolean {
  if (!partnerId) return false;
  const id = partnerId.trim().toLowerCase();
  if (!id || INTERNAL_PARTNER_IDS.has(id)) return false;
  return !id.startsWith("abraxas-");
}
