// FILE: components/terminal/tokens.ts
// Shared design tokens. Modernized pass: monospace reserved for data/numbers
// only, clean sans for headlines and body. Soft shadows replace neon glow.

export const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
export const S    = "'Inter',system-ui,-apple-system,sans-serif";
export const DISPLAY = "'Inter',system-ui,-apple-system,sans-serif";
// Structural neutrals now read from CSS variables (see app/globals.css),
// so every component using these automatically responds to the
// light/dark toggle with zero per-file changes.
export const BG   = "var(--bg)";
export const CARD = "var(--surface)";
export const BDR  = "var(--border)";
export const W    = "var(--text-primary)";
// Brand/accent colors stay fixed across both themes on purpose.
export const G    = "#10B981";
export const TEAL = "#06B6D4";
export const A    = "#F59E0B";
export const B    = "#3B82F6";
export const RED  = "#DC2626";
export const IND  = "#6366F1";
export const PUR  = "#8B5CF6";

// Soft, modern shadow utilities. Use instead of neon `0 0 Npx COLOR` glows.
export const softShadow = (color: string) => `0 4px 20px ${color}18`;
export const cardShadow = "0 2px 16px rgba(0,0,0,0.3)";
