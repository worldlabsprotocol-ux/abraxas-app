// FILE: lib/portal/registrySlug.ts
// Stable public verify slugs for owner self-serve listings.

const CLASS_PREFIX: Record<string, string> = {
  REAL_ESTATE_LAND: "LAND",
  REAL_ESTATE: "RE",
  MINERAL_RIGHTS: "MIN",
  TRIBAL_LAND: "TRIBAL",
  BUSINESS_ENTITY: "BIZ",
  OTHER: "OWNER",
};

export function registrySlugPrefix(assetClass: string): string {
  return CLASS_PREFIX[assetClass] ?? "OWNER";
}

/** ABX-LAND-A1B2C3D4 style — unique per application id. */
export function generateOwnerRegistrySlug(assetClass: string, applicationId: string): string {
  const prefix = registrySlugPrefix(assetClass);
  const suffix = applicationId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ABX-${prefix}-${suffix}`;
}
