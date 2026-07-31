"use client";
// FILE: components/home/HomeWhyAbraxas.tsx
// Why the market needs reusable trust — not a repeat of the hero.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeWhyAbraxas() {
  return (
    <section aria-labelledby="home-why-heading" className="abx-home-prose">
      <h2
        id="home-why-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.85rem",
        }}
      >
        Why Abraxas exists
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.7,
          margin: "0 0 0.85rem",
        }}
      >
        Today&apos;s compliance model doesn&apos;t scale.
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 0.85rem",
        }}
      >
        Banks, marketplaces, healthcare providers, employers, real estate platforms, and
        age-restricted businesses all collect and verify the same identity information
        independently. Users repeat verification, organizations duplicate compliance efforts,
        and sensitive data is stored over and over again.
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        Abraxas replaces repeated verification with reusable trust.
      </p>
    </section>
  );
}
