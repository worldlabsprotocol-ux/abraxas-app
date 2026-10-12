// FILE: lib/design/publicSurface.ts
// Shared layout tokens for public marketing, Passport, and developer surfaces.

import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

export const PUBLIC_FONT_SANS = ABRAXAS_FONT_SANS;
export const PUBLIC_FONT_DISPLAY = ABRAXAS_FONT_DISPLAY;
export const PUBLIC_FONT_MONO = ABRAXAS_FONT_MONO;

export const PUBLIC_CONTENT_MAX_WIDTH = 1320;
export const PUBLIC_NARROW_MAX_WIDTH = 720;
export const PUBLIC_PAGE_PADDING = "clamp(1.25rem, 4vw, 2rem)";
export const PUBLIC_SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

/** Primary product IA — each href resolves to a real route. */
export const PUBLIC_NAV_LINKS = [
  { href: "/protocol", label: "Protocol", matchPrefixes: ["/protocol", "/integrate", "/proof"] as const },
  { href: "/solutions", label: "Solutions", matchPrefixes: ["/solutions"] as const },
  { href: "/developers", label: "Developers", matchPrefixes: ["/developers", "/docs"] as const },
  { href: "/network", label: "Network", matchPrefixes: ["/network", "/proofs"] as const },
  { href: "/company", label: "Company", matchPrefixes: ["/company", "/why", "/design-partner"] as const },
] as const;

export const PUBLIC_NAV_PRIMARY_CTA = { href: "/passport", label: "Launch App" } as const;
export const PUBLIC_NAV_DOCS_CTA = { href: "/docs", label: "Developer Docs" } as const;

/** Compact Explore menu — secondary destinations. */
export const PUBLIC_NAV_EXPLORE_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/verify", label: "Verify a receipt" },
  { href: "/developers/integration-studio", label: "Integration Studio" },
  { href: "/developers/launchpad", label: "Launchpad" },
  { href: "/good-trouble", label: "Sandbox example" },
] as const;

export const PUBLIC_NAV_MAP_LINKS = [
  { href: "/#capability-map", label: "Capability map" },
  { href: "/docs/partner-flow", label: "Partner Flow" },
  { href: "/integrate", label: "For businesses" },
] as const;

export const PUBLIC_SURFACE = {
  cardRadius: 12,
  cardPadding: "1.15rem 1.25rem",
  cardBorder: "1px solid var(--border)",
  cardBackground: "var(--surface-raised)",
  eyebrowSize: "0.72rem",
  bodySize: "0.94rem",
  bodyLineHeight: 1.65,
  mutedColor: "var(--text-muted)",
} as const;
