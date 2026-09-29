"use client";
// FILE: components/product/HomeArchitectureFlow.tsx

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

const FLOW = [
  { id: "holder", label: "Holder" },
  { id: "passport", label: "Abraxas Passport" },
  { id: "evidence", label: "Reusable verified evidence" },
  { id: "policy", label: "Policy question" },
  { id: "receipt", label: "Signed eligibility receipt" },
  { id: "app", label: "Application" },
] as const;

export function HomeArchitectureFlow() {
  return (
    <section aria-label="How Abraxas works" className="abx-home-architecture">
      <div
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
          title="Application receives"
          items={["21+ eligibility: Yes", "U.S. residency: Yes", "Other approved eligibility results"]}
          tone="share"
        />
        <PrivacyProofPanel
          title="Application does not receive"
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
