"use client";
// FILE: components/redesign/ProtocolBetaBadge.tsx
// Early-access signal — institutional, not "pilot".

const FONT = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function ProtocolBetaBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Early access · protocol in active development"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: FONT,
        fontSize: compact ? "0.52rem" : "0.58rem",
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: compact ? "0.2rem 0.45rem" : "0.25rem 0.55rem",
        borderRadius: 999,
        color: "var(--accent)",
        border: "1px solid var(--accent-border)",
        background: "var(--accent-faint)",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      Beta
    </span>
  );
}
