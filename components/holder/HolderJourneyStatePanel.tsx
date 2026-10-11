"use client";

import type { HolderJourneyStateCopy } from "@/lib/product/holderJourneyStates";

const FONT = "'Inter',system-ui,sans-serif";

export function HolderJourneyStatePanel({
  copy,
  compact = false,
}: {
  copy: HolderJourneyStateCopy | null;
  compact?: boolean;
}) {
  if (!copy) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        marginBottom: compact ? "0.65rem" : "1rem",
        padding: compact ? "0.65rem 0.75rem" : "0.85rem 0.9rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.82rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)" }}>
        {copy.title}
      </p>
      <p style={{ fontFamily: FONT, fontSize: compact ? "0.74rem" : "0.78rem", lineHeight: 1.6, margin: "0 0 0.5rem", color: "var(--text-secondary)" }}>
        {copy.explanation}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, margin: 0, color: "var(--accent)" }}>
        Next: {copy.primaryAction}
      </p>
    </aside>
  );
}
