// FILE: lib/abraxasTypography.ts
// Abraxas type system — Syne display + DM Sans body + IBM Plex Mono data.
// Loaded via next/font in app/layout.tsx; consumed site-wide through CSS variables.

/** Body, UI, paragraphs */
export const ABRAXAS_FONT_SANS =
  "var(--font-sans), system-ui, -apple-system, sans-serif";

/** Headlines, hero, deck titles — geometric, not Inter-default */
export const ABRAXAS_FONT_DISPLAY =
  "var(--font-display), var(--font-sans), system-ui, sans-serif";

/** Proof IDs, gates, API paths, eyebrows */
export const ABRAXAS_FONT_MONO =
  "var(--font-mono), ui-monospace, monospace";
