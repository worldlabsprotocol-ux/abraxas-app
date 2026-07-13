"use client";
// FILE: components/home/HomeSharpHero.tsx
// Outcome-first homepage — institutional continuity from boot screen.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_HEADLINE, ABRAXAS_SUBHEAD, ABRAXAS_CATEGORY } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const HEADLINE_ACCENT = "over and over.";

export function HomeSharpHero() {
  const headlineBase = ABRAXAS_HEADLINE.replace(HEADLINE_ACCENT, "").trim();

  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(1.25rem, 4vw, 4rem) 0 clamp(0.75rem, 2vw, 1.25rem)",
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
      <p style={{
        fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
        fontWeight: 600,
        color: "var(--text-secondary)", lineHeight: 1.65,
        margin: "0 0 0.65rem",
      }}>
        {ABRAXAS_SUBHEAD}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.75rem" }}>
        <Btn href="/#registry" size="lg">Browse assets →</Btn>
        <Btn href="/passport" variant="secondary" size="lg">Get verified once →</Btn>
        <Btn href="/#product-loop" variant="ghost" size="lg">Watch the loop</Btn>
      </div>
      <p className="home-hero-tertiary" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
        <a href="/#learn" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Featured articles</a>
        {" · "}
        <a href="/#product-loop" style={{ color: "var(--accent-2)", fontWeight: 700, textDecoration: "none" }}>Watch the loop</a>
        {" · "}
        <a href="/#registry" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Registry</a>
        {" · "}
        <a href="/#partners" style={{ color: "var(--accent-2)", fontWeight: 700, textDecoration: "none" }}>Partners</a>
      </p>
      <style jsx>{`
        @media (max-width: 640px) {
          .home-hero-tertiary a[href="/#learn"],
          .home-hero-tertiary a[href="/design-partner"] {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
