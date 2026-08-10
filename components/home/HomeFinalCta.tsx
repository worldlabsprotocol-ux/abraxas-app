"use client";
// FILE: components/home/HomeFinalCta.tsx
// Closing partner CTA — integrate without building an identity warehouse.

import { Btn } from "@/components/redesign/ui";
import { HOME_FINAL_CTA_HEADLINE } from "@/lib/home/commercialHomeContent";
import { COMPLIANCE_GATE_HONESTY } from "@/lib/complianceGatePositioning";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeFinalCta() {
  return (
    <section
      aria-labelledby="home-final-cta-heading"
      className="abx-home-section-center abx-home-final-cta"
      style={{ width: "100%" }}
    >
      <h2
        id="home-final-cta-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.2rem, 3.2vw, 1.55rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 auto 1rem",
          maxWidth: 640,
          lineHeight: 1.25,
        }}
      >
        {HOME_FINAL_CTA_HEADLINE}
      </h2>
      <div className="abx-home-hero-actions" style={{ marginBottom: "0.85rem" }}>
        <Btn href="/integrate" size="lg">
          Build with Abraxas
        </Btn>
        <Btn href="/docs/partner-flow" variant="secondary" size="lg">
          Read Partner Flow
        </Btn>
      </div>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.78rem, 1.8vw, 0.88rem)",
          fontWeight: 500,
          color: "var(--text-muted, var(--text-secondary))",
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
          opacity: 0.85,
        }}
      >
        {COMPLIANCE_GATE_HONESTY}
      </p>
    </section>
  );
}
