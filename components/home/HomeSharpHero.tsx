"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline and primary CTAs.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      className="abx-home-hero"
      style={{
        padding: "clamp(1.5rem, 5vw, 3rem) 0 clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
        Live protocol · not a waitlist
      </div>

      <h1
        id="home-hero-heading"
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
          fontWeight: 900,
          letterSpacing: "-0.045em",
          lineHeight: 1.02,
          color: "var(--text-primary)",
          margin: "0 0 0.85rem",
        }}
      >
        Verify once. Transact everywhere.
      </h1>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          margin: "0 auto 0.5rem",
          lineHeight: 1.45,
          maxWidth: 640,
        }}
      >
        Reusable identity infrastructure. Users verify once. Applications consume trusted credentials.
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 auto 1.25rem",
          lineHeight: 1.45,
          maxWidth: 640,
        }}
      >
        Identity becomes portable instead of repetitive.
      </p>

      <div className="abx-home-hero-actions">
        <Btn href="/passport" size="lg">Create Passport</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Explore Protocol</Btn>
      </div>
    </section>
  );
}
