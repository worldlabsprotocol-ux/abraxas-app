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
