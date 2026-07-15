"use client";
// FILE: components/home/HomeSharpHero.tsx
// Infrastructure-first hero — one sentence, builder CTAs.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_CATEGORY, ABRAXAS_HEADLINE, ABRAXAS_SUBHEAD } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomeSharpHero() {
  const [lead, tail] = ABRAXAS_HEADLINE.split(". ").map(s => s.replace(/\.$/, ""));

  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(1.25rem, 4vw, 3.5rem) 0 clamp(0.75rem, 2vw, 1rem)",
        maxWidth: 760,
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.75rem" }}>
        {ABRAXAS_CATEGORY}
      </div>
      <h1
        id="home-hero-heading"
        style={{
          fontFamily: FONT,
          fontSize: "var(--fs-display)",
          fontWeight: 900,
          letterSpacing: "-0.045em",
          lineHeight: 0.98,
          color: "var(--text-primary)",
          margin: "0 0 0.85rem",
        }}
      >
        {lead}.{" "}
        <span className="abx-gradient-text">{tail}.</span>
      </h1>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.88rem, 2.2vw, 1rem)",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1.15rem",
          maxWidth: 620,
        }}
      >
        {ABRAXAS_SUBHEAD}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
        <Btn href="/#demo" size="lg">
          Watch demo →
        </Btn>
        <Btn href="/integrate" variant="secondary" size="lg">
          Build with Abraxas →
        </Btn>
        <Btn href="/developers" variant="ghost" size="lg">
          Developer docs →
        </Btn>
      </div>
    </section>
  );
}
