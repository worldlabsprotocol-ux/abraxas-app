"use client";
// FILE: components/product/HomeArchitectureFlow.tsx
// What partners receive vs what stays private — user value, not protocol boxes.

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

const FLOW = [
  { id: "holder", label: "You verify once" },
  { id: "passport", label: "Passport stores evidence privately" },
  { id: "question", label: "Partner asks a policy question" },
  { id: "answer", label: "Partner receives the minimal answer" },
] as const;

export function HomeArchitectureFlow() {
  return (
    <section aria-labelledby="home-architecture-heading" className="abx-home-architecture">
      <div className="abx-home-intro" style={{ marginBottom: "1rem" }}>
        <h2
          id="home-architecture-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.1rem, 2.8vw, 1.35rem)",
            fontWeight: 800,
            margin: "0 0 0.45rem",
            color: "var(--text-primary)",
          }}
        >
          What the application receives
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.84rem, 2vw, 0.92rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 520,
            marginInline: "auto",
          }}
        >
          Applications ask the question they need answered. Abraxas returns the decision — not your identity profile.
        </p>
      </div>

      <div
        className="abx-home-architecture__flow"
        style={{
          display: "grid",
          gap: "0.45rem",
          maxWidth: 420,
          margin: "0 auto 1.25rem",
        }}
      >
        {FLOW.map((step, index) => (
          <div key={step.id}>
            <div
              className="abx-home-architecture__step"
              style={{
                padding: "0.55rem 0.75rem",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.03)",
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {step.label}
            </div>
            {index < FLOW.length - 1 && (
              <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.15rem 0", textAlign: "center" }}>↓</p>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          maxWidth: 640,
          margin: "0 auto",
          textAlign: "left",
        }}
      >
        <PrivacyProofPanel
          title="Shared with the application"
          items={["21+ eligibility: Yes", "Verified customer: Yes", "Other approved eligibility results"]}
          tone="share"
        />
        <PrivacyProofPanel
          title="Not shared with the application"
          items={["Date of birth", "ID image", "Legal name", "Passport profile"]}
          tone="withhold"
        />
      </div>
    </section>
  );
}

function PrivacyProofPanel({ title, items, tone }: { title: string; items: string[]; tone: "share" | "withhold" }) {
  const color = tone === "share" ? "#10B981" : "var(--text-muted)";
  return (
    <div
      className={`abx-home-architecture__panel abx-home-architecture__panel--${tone}`}
      style={{
        borderRadius: 12,
        border: `1px solid ${tone === "share" ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
        background: tone === "share" ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
        padding: "0.75rem 0.85rem",
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color, margin: "0 0 0.45rem" }}>
        {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: "1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", display: "grid", gap: "0.2rem" }}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
