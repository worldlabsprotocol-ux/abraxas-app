"use client";
// FILE: app/north-star/page.tsx
// Internal + shareable North Star — every feature must satisfy these.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  ABRAXAS_BECKER_PITCH,
  ABRAXAS_CUDA,
  ABRAXAS_ONE_LINER,
  ABRAXAS_PRODUCT,
  NORTH_STAR_PHASES,
  NORTH_STAR_PRINCIPLES,
} from "@/lib/northStar";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

export default function NorthStarPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Abraxas North Star"
        title="Become inevitable — not bigger"
        subtitle="One page. Every feature, screen, and outreach email should satisfy these."
      />

      <ContentCard title="One sentence">
        <p style={quoteStyle}>{ABRAXAS_ONE_LINER}</p>
        <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.85rem" }}>
          <MiniQuote label="CUDA (platform)" text={ABRAXAS_CUDA} />
          <MiniQuote label="Product" text={ABRAXAS_PRODUCT} />
          <MiniQuote label="Becker pitch" text={ABRAXAS_BECKER_PITCH} />
        </div>
      </ContentCard>

      <ContentCard title="Principles">
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
          {NORTH_STAR_PRINCIPLES.map((p, i) => (
            <li key={p.id} style={{
              padding: "0.85rem 0.95rem", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, fontWeight: 700, marginBottom: 4 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                {p.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Phases — remove friction before adding surface area">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {NORTH_STAR_PHASES.map(phase => (
            <div key={phase.id} style={{
              padding: "0.95rem 1rem", borderRadius: 14,
              border: `1px solid ${phase.letter === "A" ? `${ACCENT}44` : "var(--border)"}`,
              background: phase.letter === "A" ? `${ACCENT}06` : "var(--surface-raised)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, marginBottom: 4 }}>
                Phase {phase.letter}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {phase.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
                {phase.goal}
              </p>
              <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.1rem" }}>
                {phase.bullets.map(b => (
                  <li key={b} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 3 }}>
                    {b}
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, margin: 0 }}>
                Exit: {phase.exitCriteria}
              </p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Before every significant build">
        <p style={bodyStyle}>Write a one-page memo:</p>
        <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
          {["Objective — what problem?", "Why now — highest leverage?", "Success metric — how do we know it's done?", "What we're not doing", "Decision — merge, iterate, or discard"].map(item => (
            <li key={item} style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4 }}>
              {item}
            </li>
          ))}
        </ul>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Alex Becker test: if you deleted half the homepage, would conversions go up? Ask before every PR.
        </p>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Design partner outreach →</Btn>
        <Btn href="/#workflow" variant="secondary" size="lg">Homepage workflow</Btn>
        <Link href="/" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Home →
        </Link>
      </div>
    </RedesignPage>
  );
}

function MiniQuote({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ padding: "0.65rem 0.75rem", borderRadius: 10, background: "var(--surface-inset)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

const quoteStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  lineHeight: 1.55,
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
};
