"use client";
// FILE: components/verification/VerificationEcosystemPitch.tsx
// Verification page pitch: demo + vertical table + protocol embed story.

import Link from "next/link";
import { EliteDemoSlideshow } from "@/components/home/elite/EliteDemoSlideshow";
import { VERIFICATION_ECOSYSTEM_DEMO } from "@/lib/eliteDemoSlides";
import {
  PROTOCOL_EMBED_PITCH,
  REPEATED_VERIFICATION_INDUSTRIES,
  VERIFICATION_ECOSYSTEM_HEADLINE,
  VERIFICATION_ECOSYSTEM_INSIGHT,
  VERIFICATION_ECOSYSTEM_LEAD,
  VERIFICATION_NEXT_STEPS,
  VERIFICATION_VERTICAL_TABLE,
  type VerificationVerticalRow,
} from "@/lib/verificationEcosystemPositioning";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const MONO = "'JetBrains Mono',monospace";

const STATUS_COLOR: Record<VerificationVerticalRow["status"], string> = {
  live: "#10B981",
  pilot: "#F59E0B",
  template: "#94A3B8",
};

export function VerificationEcosystemPitch() {
  return (
    <section aria-labelledby="verification-ecosystem-heading" style={{ marginBottom: "2rem" }}>
      <div style={{ marginBottom: "1.25rem", maxWidth: 720 }}>
        <h2
          id="verification-ecosystem-heading"
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(1.35rem, 3.8vw, 2.1rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            margin: "0 0 0.6rem",
          }}
        >
          {VERIFICATION_ECOSYSTEM_HEADLINE}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.92rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: "0 0 0.5rem",
        }}>
          {VERIFICATION_ECOSYSTEM_LEAD}
        </p>
        <p style={{
          fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-muted)",
          lineHeight: 1.6, margin: 0,
        }}>
          {VERIFICATION_ECOSYSTEM_INSIGHT}
        </p>
      </div>

      <EliteDemoSlideshow config={VERIFICATION_ECOSYSTEM_DEMO} />

      <div style={{ marginTop: "1.75rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          How this extends beyond one partner
        </div>
        <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--border-strong)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.76rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-inset)", textAlign: "left" }}>
                {["Vertical", "Partner today", "Abraxas path", ""].map(h => (
                  <th key={h} style={{ padding: "0.65rem 0.85rem", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VERIFICATION_VERTICAL_TABLE.map(row => (
                <tr key={row.vertical} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 0.85rem", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    {row.vertical}
                  </td>
                  <td style={{ padding: "0.75rem 0.85rem", color: "var(--text-secondary)" }}>
                    {row.partnerToday}
                  </td>
                  <td style={{ padding: "0.75rem 0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, minWidth: 220 }}>
                    {row.abraxasPath}
                  </td>
                  <td style={{ padding: "0.75rem 0.85rem" }}>
                    <span style={{
                      fontFamily: MONO, fontSize: "0.58rem", fontWeight: 800,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "0.2rem 0.45rem", borderRadius: 999,
                      color: STATUS_COLOR[row.status],
                      border: `1px solid ${STATUS_COLOR[row.status]}55`,
                      background: `${STATUS_COLOR[row.status]}12`,
                    }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: "1.75rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Same friction, many industries
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-muted)",
          lineHeight: 1.6, margin: "0 0 0.85rem", maxWidth: 640,
        }}>
          Market scan: regulated surfaces keep asking for the same proof. Abraxas does not replace counsel — it makes the outcome portable when you are cleared to use it.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.55rem",
        }}>
          {REPEATED_VERIFICATION_INDUSTRIES.map(item => (
            <div
              key={item.id}
              style={{
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                {item.friction}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                {item.regulation}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: "1.75rem",
        padding: "1.1rem 1.2rem",
        borderRadius: 16,
        border: "1px solid rgba(16,185,129,0.35)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%)",
      }}>
        <div style={{ fontFamily: DISPLAY, fontSize: "1.05rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {PROTOCOL_EMBED_PITCH.headline}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem", maxWidth: 640 }}>
          {PROTOCOL_EMBED_PITCH.body}
        </p>
        <ol style={{ margin: "0 0 1rem", paddingLeft: "1.15rem" }}>
          {PROTOCOL_EMBED_PITCH.steps.map(step => (
            <li key={step} style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4 }}>
              {step}
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Link href="/integrations" style={ctaStyle}>Integrations →</Link>
          <Link href="/good-trouble" style={ctaGhostStyle}>Cannabis pilot</Link>
          <Link href="/api/docs/agents" style={ctaGhostStyle}>Agent / MCP docs</Link>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Next product steps
        </div>
        <div style={{ display: "grid", gap: "0.55rem" }}>
          {VERIFICATION_NEXT_STEPS.map((step, i) => (
            <div
              key={step.title}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.75rem",
                padding: "0.75rem 0.9rem",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}
            >
              <span style={{
                fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800,
                color: "var(--accent)", paddingTop: 2,
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ctaStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.74rem",
  fontWeight: 700,
  padding: "0.45rem 0.85rem",
  borderRadius: 999,
  background: "var(--accent)",
  color: "#000",
  textDecoration: "none",
};

const ctaGhostStyle: React.CSSProperties = {
  ...ctaStyle,
  background: "transparent",
  color: "var(--accent)",
  border: "1px solid rgba(16,185,129,0.4)",
};
