"use client";
// FILE: components/integrate/IntegratorStartHerePanel.tsx
// Above-the-fold integrator path for /integrate.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  INTEGRATOR_SANDBOX_BOUNDARY,
  INTEGRATOR_START_HERE_STEPS,
  PARTNER_APPLICATION_PATH,
  PARTNER_POST_APPLY_HEADLINE,
  PARTNER_POST_APPLY_STEPS,
  PARTNER_RECEIPT_DOCS_ANCHOR,
  PARTNER_RECEIPT_MIRROR_NOTE,
  PARTNER_RECEIPT_VERIFIER_PATH,
  type IntegratorAvailability,
} from "@/lib/integrate/partnerJourney";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const ACCENT = "var(--accent)";

const AVAILABILITY_LABEL: Record<IntegratorAvailability, string> = {
  now: "Available now",
  after_approval: "After manual approval",
  operator_provisioned: "Operator-provisioned",
};

export function IntegratorStartHerePanel({ id = "start-here" }: { id?: string }) {
  return (
    <section
      id={id}
      aria-labelledby="integrator-start-heading"
      style={{
        marginBottom: "1.5rem",
        padding: "clamp(1rem, 2.5vw, 1.35rem)",
        borderRadius: 18,
        border: "1px solid rgba(232,197,71,0.35)",
        background: "linear-gradient(135deg, rgba(232,197,71,0.08) 0%, rgba(16,185,129,0.05) 100%)",
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: ACCENT,
          marginBottom: "0.5rem",
        }}
      >
        Partner integrators · start here
      </div>
      <h2
        id="integrator-start-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.1rem, 2.8vw, 1.35rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        From discovery to verified receipt in four steps
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1rem",
          maxWidth: 720,
        }}
      >
        For age-gated digital commerce teams embedding Abraxas Partner Flow. Holders verify in the browser;
        your backend verifies the signed receipt before granting access.
      </p>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
        {INTEGRATOR_START_HERE_STEPS.map((item) => (
          <li
            key={item.step}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "0.75rem",
              alignItems: "start",
              padding: "0.85rem 1rem",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: "0.72rem",
                fontWeight: 800,
                background: "rgba(16,185,129,0.12)",
                color: "#10B981",
                border: "1px solid rgba(16,185,129,0.3)",
                flexShrink: 0,
              }}
            >
              {item.step}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {item.title}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {AVAILABILITY_LABEL[item.availability]}
                </span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {item.body}
              </p>
            </div>
            <Link
              href={item.cta.href}
              style={{
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 700,
                color: ACCENT,
                textDecoration: "none",
                whiteSpace: "nowrap",
                alignSelf: "center",
              }}
            >
              {item.cta.label} →
            </Link>
          </li>
        ))}
      </ol>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: "0.65rem",
          marginTop: "1rem",
        }}
      >
        <div style={{ padding: "0.85rem", borderRadius: 12, border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "#F59E0B", marginBottom: 4 }}>
            {INTEGRATOR_SANDBOX_BOUNDARY.sandboxLabel}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
            {INTEGRATOR_SANDBOX_BOUNDARY.sandboxDetail}
          </p>
        </div>
        <div style={{ padding: "0.85rem", borderRadius: 12, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "#10B981", marginBottom: 4 }}>
            {INTEGRATOR_SANDBOX_BOUNDARY.productionLabel}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
            {INTEGRATOR_SANDBOX_BOUNDARY.productionDetail}
          </p>
        </div>
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {PARTNER_POST_APPLY_HEADLINE}
        </div>
        <ol style={{
          margin: "0 0 0.5rem",
          paddingLeft: "1.15rem",
          fontFamily: FONT,
          fontSize: "0.74rem",
          color: "var(--text-secondary)",
          lineHeight: 1.55,
        }}>
          {PARTNER_POST_APPLY_STEPS.map((step) => (
            <li key={step} style={{ marginBottom: 3 }}>{step}</li>
          ))}
        </ol>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {PARTNER_RECEIPT_MIRROR_NOTE}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        <Btn href="/docs/partner-flow" size="sm">Partner Flow docs</Btn>
        <Btn href={PARTNER_APPLICATION_PATH} variant="secondary" size="sm">Apply for review</Btn>
        <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} variant="ghost" size="sm">Receipt verification</Btn>
        <Btn href={PARTNER_RECEIPT_VERIFIER_PATH} variant="ghost" size="sm">Receipt tester (mirror)</Btn>
      </div>
    </section>
  );
}
