"use client";
// FILE: components/home/HomeSharpHero.tsx
// Five-second homepage opener — emotion, mechanism, two actions.

import { Btn } from "@/components/redesign/ui";
import {
  ABRAXAS_CATEGORY,
  ABRAXAS_EMOTION_HEADLINE,
  ABRAXAS_MECHANISM,
  ABRAXAS_SUBHEAD,
} from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeSharpHero() {
  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(2.5rem, 6vw, 4rem) 0 clamp(1rem, 3vw, 1.5rem)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        {ABRAXAS_CATEGORY}
      </div>
      <h1 id="home-hero-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
        letterSpacing: "-0.045em", lineHeight: 0.98,
        color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 680,
      }}>
        {ABRAXAS_EMOTION_HEADLINE}
      </h1>
      <p style={{
        fontFamily: FONT, fontSize: "clamp(1.05rem, 2.5vw, 1.3rem)", fontWeight: 700,
        letterSpacing: "-0.02em", lineHeight: 1.2, color: ACCENT,
        margin: "0 0 1rem", maxWidth: 560,
      }}>
        {ABRAXAS_MECHANISM}
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
        color: "var(--text-secondary)", lineHeight: 1.65,
        maxWidth: 560, margin: "0 0 1.75rem",
      }}>
        {ABRAXAS_SUBHEAD}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Btn href="/passport" size="lg">Create Passport →</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Integrate Abraxas →</Btn>
        <Btn href="/passport?view=verify" variant="ghost" size="lg">Verify a record →</Btn>
      </div>
    </section>
  );
}
