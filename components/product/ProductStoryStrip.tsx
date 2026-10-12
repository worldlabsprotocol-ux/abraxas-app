"use client";

import { PRODUCT_STORY_PILLARS, PRODUCT_STORY_TAGLINE } from "@/lib/product/productStoryCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function ProductStoryStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="How Abraxas works"
      style={{
        marginBottom: compact ? "1rem" : "1.25rem",
        padding: compact ? "0.85rem 1rem" : "1rem 1.1rem",
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.88rem", lineHeight: 1.55, margin: "0 0 0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>
        {PRODUCT_STORY_TAGLINE}
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: compact ? "0.45rem" : "0.55rem",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        {PRODUCT_STORY_PILLARS.map(p => (
          <li key={p.id}>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, margin: "0 0 0.15rem", color: "var(--text-primary)" }}>
              {p.title}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.45, margin: 0, color: "var(--text-secondary)" }}>
              {p.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
