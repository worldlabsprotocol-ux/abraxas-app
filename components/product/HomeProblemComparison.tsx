"use client";
// FILE: components/product/HomeProblemComparison.tsx

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export function HomeProblemComparison() {
  return (
    <section aria-labelledby="problem-comparison-heading" className="abx-problem-comparison">
      <h2
        id="problem-comparison-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.1rem, 2.8vw, 1.35rem)",
          fontWeight: 800,
          margin: "0 0 1rem",
          color: "var(--text-primary)",
        }}
      >
        Verify once. Answer many questions.
      </h2>
      <div
        style={{
          display: "grid",
          gap: "0.85rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          textAlign: "left",
        }}
      >
        <ComparisonPanel title="Traditional approach" tone="muted">
          <FlowLine>Customer → Application A → Upload identity data</FlowLine>
          <FlowLine>Customer → Application B → Upload identity data again</FlowLine>
          <FlowLine>Customer → Application C → Upload identity data again</FlowLine>
          <p style={noteStyle}>Each application stores underlying identity data.</p>
        </ComparisonPanel>
        <ComparisonPanel title="Abraxas" tone="accent">
          <FlowLine>Customer → Abraxas Passport → Reusable evidence</FlowLine>
          <FlowLine>Application A → asks 21+?</FlowLine>
          <FlowLine>Application B → asks 21+?</FlowLine>
          <FlowLine>Application C → asks US residency?</FlowLine>
          <p style={noteStyle}>Each application receives only its approved answer.</p>
        </ComparisonPanel>
      </div>
    </section>
  );
}

function ComparisonPanel({ title, tone, children }: { title: string; tone: "muted" | "accent"; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: tone === "accent" ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border)",
        background: tone === "accent" ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
        padding: "0.9rem 1rem",
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: tone === "accent" ? "#10B981" : "var(--text-muted)", margin: "0 0 0.65rem" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function FlowLine({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: "0 0 0.35rem" }}>
      {children}
    </p>
  );
}

const noteStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  color: "var(--text-muted)",
  margin: "0.55rem 0 0",
  lineHeight: 1.5,
};
