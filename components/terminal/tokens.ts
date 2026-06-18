// FILE: components/terminal/tokens.ts
// Shared design tokens. Modernized pass: monospace reserved for data/numbers
// only, clean sans for headlines and body. Soft shadows replace neon glow.

export const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
export const S    = "'Inter',system-ui,-apple-system,sans-serif";
export const DISPLAY = "'Inter',system-ui,-apple-system,sans-serif";
export const BG   = "#0A0C10";
export const CARD = "#0D1117";
export const BDR  = "#1C2333";
export const G    = "#10B981";
export const TEAL = "#06B6D4";
export const A    = "#F59E0B";
export const B    = "#3B82F6";
export const W    = "#F8FAFC";
export const RED  = "#DC2626";
export const IND  = "#6366F1";
export const PUR  = "#8B5CF6";

// Soft, modern shadow utilities. Use instead of neon `0 0 Npx COLOR` glows.
export const softShadow = (color: string) => `0 4px 20px ${color}18`;
export const cardShadow = "0 2px 16px rgba(0,0,0,0.3)";
