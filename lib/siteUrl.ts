// FILE: lib/siteUrl.ts
// Single canonical production URL for Abraxas. All fallbacks use this.

export const SITE_URL = "https://abraxasworld.xyz";

export function siteUrl(path = ""): string {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${SITE_URL}${clean}`;
}
