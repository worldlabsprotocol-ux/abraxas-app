"use client";
// FILE: components/home/HomeSharpHero.tsx
// Outcome-first homepage — trust infrastructure, not identity jargon.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_HEADLINE, ABRAXAS_SUBHEAD } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeSharpHero() {
  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(2.5rem, 6vw, 4rem) 0 clamp(1.5rem, 3vw, 2rem)",
      maxWidth: 720,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        Trust infrastructure
      </div>
      <h1 id="home-hero-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
        letterSpacing: "-0.045em", lineHeight: 0.98,
        color: "var(--text-primary)", margin: "0 0 1rem",
      }}>
        {ABRAXAS_HEADLINE}
      </h1>
      <p style={{
        fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
        color: "var(--text-primary)", lineHeight: 1.65,
        margin: "0 0 0.65rem",
      }}>
        {ABRAXAS_SUBHEAD}
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.55, margin: "0 0 1.25rem",
      }}>
        You prove something once. Then you never upload it again.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1rem" }}>
        <Btn href="/passport" size="lg">Get verified once →</Btn>
        <Btn href="/#workflow" variant="secondary" size="lg">See the difference</Btn>
        <Btn href="/cielo/verified-rate" variant="ghost" size="lg">Try Cielo pilot →</Btn>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
        <a href="/#product-loop" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Watch the loop</a>
        {" · "}
        <a href="/north-star" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>North Star</a>
        {" · "}
        <a href="/design-partner" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Design partner</a>
      </p>
    </section>
  );
}
