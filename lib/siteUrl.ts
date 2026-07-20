// FILE: lib/siteUrl.ts
// Canonical site URL — set NEXT_PUBLIC_SITE_URL when moving off *.vercel.app.

const FALLBACK = "https://abraxas-app.vercel.app";

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK).replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${base}${clean}`;
}

/** For metadata / OG — same as siteUrl() without path. */
export function canonicalOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK).replace(/\/$/, "");
}

export const SITE_URL = canonicalOrigin();
