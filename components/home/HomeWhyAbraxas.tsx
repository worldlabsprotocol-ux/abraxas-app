"use client";
// FILE: components/home/HomeWhyAbraxas.tsx
// Why the product exists, before feature cards.

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
      <blockquote
        style={{
          margin: "0 0 0.85rem",
          padding: 0,
          border: "none",
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          fontStyle: "normal",
          color: "var(--text-secondary)",
          lineHeight: 1.7,
        }}
      >
        Every financial platform asks users to verify themselves again. Every issuer repeats
        compliance. Every institution rebuilds trust from scratch. Every dispensary, delivery
        service, or regulated marketplace asks users to prove the same eligibility again.
      </blockquote>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 0.65rem",
        }}
      >
        Abraxas turns identity verification into reusable infrastructure. Verify once, receive a
        portable credential, and use it anywhere that trusts the protocol.
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
        Age verified once. Trusted everywhere. Reusable credentials for age, identity, and compliance.
        Eligibility infrastructure that works across industries, not a single vertical product.
      </p>
    </section>
  );
}
