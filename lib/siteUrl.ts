// FILE: lib/siteUrl.ts
// Single canonical production URL for Abraxas. All fallbacks use this.

export const SITE_URL = "https://abraxas-app.vercel.app";

export function siteUrl(path = ""): string {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${SITE_URL}${clean}`;
}
