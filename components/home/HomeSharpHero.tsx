"use client";
// FILE: components/home/HomeSharpHero.tsx
// Outcome-first homepage — demo video carries the explainer.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_HEADLINE, ABRAXAS_CATEGORY } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const HEADLINE_ACCENT = "over and over.";

export function HomeSharpHero() {
  const headlineBase = ABRAXAS_HEADLINE.replace(HEADLINE_ACCENT, "").trim();

  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(1.25rem, 4vw, 4rem) 0 clamp(0.75rem, 2vw, 1rem)",
      maxWidth: 720,
    }}>
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.75rem" }}>
        {ABRAXAS_CATEGORY}
      </div>
      <h1 id="home-hero-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
        letterSpacing: "-0.045em", lineHeight: 0.98,
        color: "var(--text-primary)", margin: "0 0 1rem",
      }}>
        {headlineBase}{" "}
        <span style={{ color: "var(--accent-pale)" }} className="abx-gradient-text">{HEADLINE_ACCENT}</span>
      </h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
        <Btn href="/#demo" size="lg">Watch demo →</Btn>
        <Btn href="/#registry" variant="secondary" size="lg">Browse assets →</Btn>
        <Btn href="/passport" variant="ghost" size="lg">Get verified once →</Btn>
      </div>
    </section>
  );
}
