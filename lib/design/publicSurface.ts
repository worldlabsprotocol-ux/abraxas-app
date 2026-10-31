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

/** @deprecated Use PUBLIC_NAV_MENUS for header IA; retained for legacy mobile helpers. */
export const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Overview", exact: true },
  { href: "/try", label: "Public demo" },
  { href: "/passport", label: "Passport" },
] as const;

export type PublicNavMenuLink = { href: string; label: string };

export type PublicNavMenuGroup = {
  id: "product" | "developers" | "solutions";
  label: string;
  links: readonly PublicNavMenuLink[];
};

/** Top navigation — one interaction to primary destinations. */
export const PUBLIC_NAV_MENUS: readonly PublicNavMenuGroup[] = [
  {
    id: "product",
    label: "Product",
    links: [
      { href: "/", label: "Overview" },
      { href: "/try", label: "Public demo" },
      { href: "/passport", label: "Passport" },
    ],
  },
  {
    id: "developers",
    label: "Developers",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/verification", label: "Independent verifier" },
      { href: "/developers/integration-studio", label: "Integration Studio" },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    links: [
      { href: "/docs/partner-flow", label: "Partner Flow" },
      { href: "/integrate", label: "For businesses" },
    ],
  },
] as const;

export function publicNavMenusForPath(pathname: string | null): readonly PublicNavMenuGroup[] {
  if (pathname !== "/") return PUBLIC_NAV_MENUS;

  return PUBLIC_NAV_MENUS.map((menu) => (
    menu.id === "product"
      ? { ...menu, links: menu.links.filter((link) => link.href !== "/") }
      : menu
  ));
}

export const PUBLIC_NAV_START_BUILDING = {
  href: "/#start-sandbox",
  label: "Start building",
} as const;

export const PUBLIC_NAV_PRIMARY_CTA = { href: "/passport", label: "Launch App" } as const;
export const PUBLIC_NAV_DOCS_CTA = { href: "/docs", label: "Developer Docs" } as const;

/** Compact Explore menu — secondary destinations. */
export const PUBLIC_NAV_EXPLORE_LINKS = [
  { href: "/verification", label: "Verification" },
  { href: "/pricing", label: "Pricing" },
  { href: "/developers/launchpad", label: "Launchpad" },
  { href: "/docs/partner-flow", label: "Partner Flow" },
  { href: "/docs", label: "Docs" },
  { href: "/#capability-map", label: "Capability map" },
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
