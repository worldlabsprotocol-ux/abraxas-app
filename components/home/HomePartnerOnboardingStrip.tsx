"use client";
// FILE: components/home/HomePartnerOnboardingStrip.tsx
// Homepage partner onboarding positioning — available now vs in development.

import { Btn } from "@/components/redesign/ui";
import {
  PARTNER_ONBOARDING_HEADLINE,
  PARTNER_ONBOARDING_SUPPORTING_COPY,
  PARTNER_ONBOARDING_DOC_LINKS,
  PARTNER_ONBOARDING_AVAILABLE_NOW,
  PARTNER_ONBOARDING_FUTURE_LABEL,
} from "@/lib/partner/partnerOnboardingPositioning";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function HomePartnerOnboardingStrip() {
  return (
    <section
      id="partner-onboarding"
      aria-labelledby="home-partner-onboarding-heading"
      className="abx-home-section-center"
      style={{
        width: "100%",
        maxWidth: 880,
        padding: "clamp(1rem, 3vw, 1.5rem)",
        borderRadius: 18,
        border: "1px solid rgba(16,185,129,0.3)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.04) 100%)",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#10B981", marginBottom: "0.5rem" }}>
        Partner Flow · public beta
      </div>
      <h2
        id="home-partner-onboarding-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        {PARTNER_ONBOARDING_HEADLINE}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 auto 1rem", maxWidth: 640 }}>
        {PARTNER_ONBOARDING_SUPPORTING_COPY}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 auto 1rem", maxWidth: 640 }}>
        <strong style={{ color: "var(--text-secondary)" }}>Available now:</strong>{" "}
        {PARTNER_ONBOARDING_AVAILABLE_NOW.map((c) => c.label).join(" · ")}.
        {" "}
        <strong style={{ color: "var(--text-secondary)" }}>{PARTNER_ONBOARDING_FUTURE_LABEL}:</strong> consented passwordless partner accounts, optional email sharing, and separate newsletter consent — not deployed yet.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
        <Btn href={PARTNER_ONBOARDING_DOC_LINKS.partnerFlow} size="sm">Partner Flow docs</Btn>
        <Btn href={PARTNER_ONBOARDING_DOC_LINKS.designPartner} variant="secondary" size="sm">Design partner program</Btn>
        <Btn href={PARTNER_ONBOARDING_DOC_LINKS.integrationsApply} variant="ghost" size="sm">Apply for sandbox</Btn>
      </div>
    </section>
  );
}
