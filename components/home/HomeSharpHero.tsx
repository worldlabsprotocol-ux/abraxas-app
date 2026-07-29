"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline and CTAs only. Photography lives in Protocol in Action.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(1.5rem, 5vw, 3rem) 0 clamp(0.25rem, 2vw, 0.75rem)",
        maxWidth: 780,
      }}
    >
      <p className="abx-section-label" style={{ marginBottom: "0.65rem" }}>
        Reusable verification layer
      </p>

      <h1
        id="home-hero-heading"
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
          color: "var(--text-primary)",
          margin: "0 0 0.85rem",
        }}
      >
        Verify once. Transact everywhere.
      </h1>

      <p className="abx-home-lead" style={{ marginBottom: "0.45rem", maxWidth: 640 }}>
        Users verify once. Applications consume trusted credentials instead of rebuilding identity flows.
      </p>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.92rem",
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "0 0 1.25rem",
        lineHeight: 1.5,
        maxWidth: 640,
      }}>
        Identity becomes portable instead of repetitive.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Btn href="/passport" size="lg">Create Passport</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Integrate</Btn>
      </div>
    </section>
  );
}
