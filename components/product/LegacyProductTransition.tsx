"use client";
// FILE: components/product/LegacyProductTransition.tsx
// Honest transition banner for legacy public routes.

import { Btn } from "@/components/redesign/ui";
import { LEGACY_TRANSITION_EYEBROW } from "@/lib/product/legacyRoutes";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export function LegacyProductTransition({
  title,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section
      aria-labelledby="legacy-transition-heading"
      style={{
        borderRadius: 16,
        border: "1px solid rgba(251,191,36,0.35)",
        background: "rgba(251,191,36,0.08)",
        padding: "1rem 1.1rem",
        marginBottom: "1.25rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.62rem",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#FBBF24",
        margin: "0 0 0.35rem",
      }}>
        {LEGACY_TRANSITION_EYEBROW}
      </p>
      <h1 id="legacy-transition-heading" style={{
        fontFamily: FONT,
        fontSize: "1.05rem",
        fontWeight: 800,
        color: "var(--text-primary)",
        margin: "0 0 0.45rem",
        lineHeight: 1.35,
      }}>
        {title}
      </h1>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.82rem",
        lineHeight: 1.6,
        color: "var(--text-secondary)",
        margin: "0 0 0.85rem",
      }}>
        {body}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href={primaryHref} size="sm">{primaryLabel}</Btn>
        {secondaryLabel && secondaryHref ? (
          <Btn href={secondaryHref} size="sm" variant="secondary">{secondaryLabel}</Btn>
        ) : null}
      </div>
    </section>
  );
}
