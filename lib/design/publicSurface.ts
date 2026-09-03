// FILE: lib/design/publicSurface.ts
// Shared layout tokens for public marketing, Passport, and developer surfaces.

import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

export const PUBLIC_FONT_SANS = ABRAXAS_FONT_SANS;
export const PUBLIC_FONT_DISPLAY = ABRAXAS_FONT_DISPLAY;
export const PUBLIC_FONT_MONO = ABRAXAS_FONT_MONO;

export const PUBLIC_CONTENT_MAX_WIDTH = 980;
export const PUBLIC_NARROW_MAX_WIDTH = 720;
export const PUBLIC_PAGE_PADDING = "clamp(1.25rem, 4vw, 2rem)";
export const PUBLIC_SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

export const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Home", exact: true as const },
  { href: "/passport", label: "Passport", matchPrefixes: ["/passport"] as const },
  { href: "/integrate", label: "For businesses", matchPrefixes: ["/integrate", "/developers", "/design-partner"] as const },
  { href: "/docs/partner-flow", label: "Docs", matchPrefixes: ["/docs"] as const },
] as const;

export const PUBLIC_SURFACE = {
  cardRadius: 16,
  cardPadding: "1.15rem 1.25rem",
  cardBorder: "1px solid rgba(255,255,255,0.08)",
  cardBackground: "rgba(12,14,24,0.55)",
  eyebrowSize: "0.72rem",
  bodySize: "0.9rem",
  bodyLineHeight: 1.6,
  mutedColor: "var(--text-muted)",
} as const;
