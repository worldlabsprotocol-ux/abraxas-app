"use client";
// FILE: components/integrate/PartnerOnboardingPositioningPanel.tsx
// Shared positioning panel — truthful available vs in-development capabilities.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  PARTNER_CONSENT_MOCKUP_CONTROLS,
  PARTNER_CONSENT_MOCKUP_NOTE,
  PARTNER_ONBOARDING_AVAILABLE_NOW,
  PARTNER_ONBOARDING_AVAILABILITY_LABEL,
  PARTNER_ONBOARDING_DOC_LINKS,
  PARTNER_ONBOARDING_FUTURE_EXPLAINER,
  PARTNER_ONBOARDING_FUTURE_LABEL,
  PARTNER_ONBOARDING_HEADLINE,
  PARTNER_ONBOARDING_HOW_IT_WORKS,
  PARTNER_ONBOARDING_IN_DEVELOPMENT,
  PARTNER_ONBOARDING_PRIVACY_PRINCIPLES,
  PARTNER_ONBOARDING_SUPPORTING_COPY,
} from "@/lib/partner/partnerOnboardingPositioning";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function CapabilityList({
  items,
  accent,
}: {
  items: typeof PARTNER_ONBOARDING_AVAILABLE_NOW;
  accent: string;
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
      {items.map((item) => (
        <li
          key={item.id}
          style={{
            padding: "0.75rem 0.85rem",
            borderRadius: 12,
            border: `1px solid ${accent}33`,
            background: `${accent}08`,
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {item.label}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              {PARTNER_ONBOARDING_AVAILABILITY_LABEL[item.availability]}
            </span>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
            {item.detail}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function PartnerOnboardingPositioningPanel({
  showConsentMockup = true,
  compact = false,
}: {
  showConsentMockup?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      aria-labelledby="partner-onboarding-positioning-heading"
      style={{
        marginBottom: "1.25rem",
        padding: compact ? "1rem" : "clamp(1rem, 2.5vw, 1.35rem)",
        borderRadius: 18,
        border: "1px solid rgba(16,185,129,0.35)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.05) 100%)",
        maxWidth: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#10B981", marginBottom: "0.5rem" }}>
        Partner onboarding · honest capability map
      </div>
      <h2
        id="partner-onboarding-positioning-heading"
        style={{
          fontFamily: FONT,
          fontSize: compact ? "1.05rem" : "clamp(1.1rem, 2.8vw, 1.4rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        {PARTNER_ONBOARDING_HEADLINE}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 720 }}>
        {PARTNER_ONBOARDING_SUPPORTING_COPY}
      </p>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "#10B981", margin: "0 0 0.5rem" }}>Available now</h3>
          <CapabilityList items={PARTNER_ONBOARDING_AVAILABLE_NOW} accent="#10B981" />
        </div>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "#3B82F6", margin: "0 0 0.5rem" }}>{PARTNER_ONBOARDING_FUTURE_LABEL}</h3>
          <CapabilityList items={PARTNER_ONBOARDING_IN_DEVELOPMENT} accent="#3B82F6" />
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0.65rem 0 0" }}>
            <strong style={{ color: "var(--text-secondary)" }}>{PARTNER_ONBOARDING_FUTURE_LABEL}:</strong>{" "}
            {PARTNER_ONBOARDING_FUTURE_EXPLAINER}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>How it works</h3>
        <ol style={{ margin: 0, paddingLeft: "1.15rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {PARTNER_ONBOARDING_HOW_IT_WORKS.map((step) => (
            <li key={step.step} style={{ marginBottom: 6 }}>
              <strong style={{ color: "var(--text-primary)" }}>{step.title}</strong>
              {" — "}
              {step.body}
            </li>
          ))}
        </ol>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>Privacy and ownership</h3>
        <ul style={{ margin: 0, paddingLeft: "1.15rem", fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {PARTNER_ONBOARDING_PRIVACY_PRINCIPLES.map((line) => (
            <li key={line} style={{ marginBottom: 4 }}>{line}</li>
          ))}
        </ul>
      </div>

      {showConsentMockup && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: 12,
            border: "1px dashed var(--border-strong)",
            background: "var(--surface-inset)",
          }}
          aria-label="Illustrative consent mockup"
        >
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Illustrative consent layout (not live)
          </div>
          {PARTNER_CONSENT_MOCKUP_CONTROLS.map((control) => (
            <label
              key={control.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                fontFamily: FONT,
                fontSize: "0.78rem",
                color: control.disabled ? "var(--text-muted)" : "var(--text-secondary)",
                marginBottom: 6,
                cursor: "not-allowed",
              }}
            >
              <input type="checkbox" checked={control.defaultChecked} disabled={control.disabled} readOnly style={{ marginTop: 3 }} />
              <span>{control.label}</span>
            </label>
          ))}
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
            {PARTNER_CONSENT_MOCKUP_NOTE}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        <Btn href={PARTNER_ONBOARDING_DOC_LINKS.partnerFlow} size="sm">Partner Flow docs</Btn>
        <Btn href={PARTNER_ONBOARDING_DOC_LINKS.integrationsApply} variant="secondary" size="sm">Apply for sandbox</Btn>
        <Link href={PARTNER_ONBOARDING_DOC_LINKS.passwordlessPlan} style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Passwordless onboarding plan →
        </Link>
      </div>
    </section>
  );
}
