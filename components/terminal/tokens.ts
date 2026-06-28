// FILE: components/terminal/tokens.ts
// Shared design tokens. Structural colors read from CSS variables.

export const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
export const S    = "'Inter',system-ui,-apple-system,sans-serif";
export const DISPLAY = "'Inter',system-ui,-apple-system,sans-serif";

export const BG   = "var(--bg)";
export const CARD = "var(--surface)";
export const RAISED = "var(--surface-raised)";
export const BDR  = "var(--border)";
export const W    = "var(--text-primary)";
export const MUTED = "var(--text-muted)";
export const SECONDARY = "var(--text-secondary)";

export const G    = "#10B981";
export const TEAL = "#06B6D4";
export const A    = "#F59E0B";
export const B    = "#3B82F6";
export const RED  = "#DC2626";
export const IND  = "#6366F1";
export const PUR  = "#8B5CF6";

export const softShadow = (color: string) => `0 4px 20px ${color}18`;
export const cardShadow = "var(--shadow-card)";
export const glowBorder = "var(--shadow-glow)";
