// FILE: lib/partner/launchpad/slug.ts

export function slugifyLaunchpadApplication(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidLaunchpadPublicSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug);
}

/** Stable per-tenant slug — avoids global public_slug collisions for common names like "test". */
export function resolveLaunchpadPublicSlug(applicationName: string, partnerId: string): string {
  const base = slugifyLaunchpadApplication(applicationName) || "app";
  const tenantTag = partnerId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-10);
  if (!tenantTag || base.endsWith(tenantTag)) {
    return base.slice(0, 62);
  }
  const combined = `${base}-${tenantTag}`.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const slug = combined.slice(0, 62);
  return isValidLaunchpadPublicSlug(slug) ? slug : base.slice(0, 62);
}
