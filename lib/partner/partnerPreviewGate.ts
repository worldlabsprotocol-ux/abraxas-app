// FILE: lib/partner/partnerPreviewGate.ts
// Environment gates for partner holder preview routes (never enabled in Production).

/** Shared gate for release-gate and age-assurance preview pages. */
export function isPartnerHolderPreviewAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.PARTNER_RELEASE_GATE_PREVIEW === "true") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV === "development";
}

/** Tier 1 browse self-attestation preview — development and Vercel Preview only. */
export function isTieredAgePreviewAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return false;
}
