"use client";
// FILE: components/home/HomeSharpHero.tsx
// Three-layer hierarchy. emotion · mechanism · category (10-second read).

import { Btn } from "@/components/redesign/ui";
import {
  ABRAXAS_CATEGORY,
  ABRAXAS_EMOTION_HEADLINE,
  ABRAXAS_MECHANISM,
  ABRAXAS_HEADLINE,
  ABRAXAS_SUBHEAD,
} from "@/lib/northStar";

import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeSharpHero() {
  const [tagLead, tagTail] = ABRAXAS_HEADLINE.split(". ").map(s => s.replace(/\.$/, ""));

  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(1.5rem, 5vw, 3rem) 0 clamp(1rem, 3vw, 1.5rem)",
        maxWidth: 780,
      }}
    >
      <h1
        id="home-hero-heading"
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
          fontWeight: 900,
          letterSpacing: "-0.045em",
          lineHeight: 1.02,
          color: "var(--text-primary)",
          margin: "0 0 0.55rem",
        }}
      >
        {ABRAXAS_EMOTION_HEADLINE}
      </h1>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.05rem, 2.8vw, 1.35rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-secondary)",
          margin: "0 0 0.65rem",
          lineHeight: 1.25,
        }}
      >
        {ABRAXAS_MECHANISM}
      </p>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 0.5rem",
          lineHeight: 1.2,
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>{tagLead}. </span>
        <span className="abx-gradient-text">{tagTail}.</span>
      </p>

      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.85rem" }}>
        {ABRAXAS_CATEGORY}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.86rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1.15rem",
          maxWidth: 640,
        }}
      >
        {ABRAXAS_SUBHEAD}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
        <Btn href="/integrate" size="lg">
          Build with Abraxas
        </Btn>
      </div>
    </section>
  );
}
