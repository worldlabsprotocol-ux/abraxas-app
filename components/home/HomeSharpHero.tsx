"use client";
// FILE: components/home/HomeSharpHero.tsx
// Problem-first hero — verify once, transact everywhere.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(1.5rem, 5vw, 3rem) 0 clamp(1rem, 3vw, 1.5rem)",
        maxWidth: 780,
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
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          margin: "0 0 0.65rem",
          lineHeight: 1.65,
          maxWidth: 680,
        }}
      >
        Identity verification is fragmented. Every platform asks users to repeat KYC, businesses
        repeat compliance, and trust doesn&apos;t travel.
      </p>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          margin: "0 0 1.25rem",
          lineHeight: 1.65,
          maxWidth: 680,
        }}
      >
        Abraxas creates reusable identity credentials secured by biometrics so verification can
        move with the user instead of restarting every time.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
        <Btn href="/passport" size="lg">Create Passport</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Explore Protocol</Btn>
      </div>
    </section>
  );
}
