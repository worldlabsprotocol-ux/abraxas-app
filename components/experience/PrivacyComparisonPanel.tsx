"use client";

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export type PrivacyComparisonPartner = "cielo" | "good_trouble" | "generic";

const PARTNER_DISCLOSURE: Record<PrivacyComparisonPartner, { shares: string[]; never: string[]; note?: string }> = {
  cielo: {
    shares: ["Verified guest eligibility category", "Signed decision receipt", "Policy version and validity window"],
    never: ["Government ID images", "Legal name", "Date of birth", "Biometric templates", "Email from Abraxas Passport"],
    note: "Cielo verified-rate confirms guest eligibility — not a hotel booking or payment.",
  },
  good_trouble: {
    shares: ["Age 21+ retail eligibility category", "Signed decision receipt", "Policy version and validity window"],
    never: ["Date of birth", "Document numbers", "Selfie or ID photos", "Full identity profile"],
    note: "Good Trouble receives an eligibility decision — not your date of birth or ID documents.",
  },
  generic: {
    shares: ["Narrow eligibility category approved by policy", "Signed Abraxas receipt"],
    never: ["Raw identity documents", "Biometrics", "Full profile"],
  },
};

export function PrivacyComparisonPanel(props: { partner?: PrivacyComparisonPartner; compact?: boolean }) {
  const partner = props.partner ?? "generic";
  const detail = PARTNER_DISCLOSURE[partner];

  return (
    <div
      style={{
        display: "grid",
        gap: props.compact ? "0.75rem" : "1rem",
        gridTemplateColumns: props.compact ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
      }}
    >
      <article style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0 0 0.5rem" }}>Traditional apps</h3>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
          Each application collects sensitive documents and profile data again. Users repeat uploads; partners store more risk.
        </p>
      </article>
      <article style={{ border: "1px solid var(--border-strong)", borderRadius: 12, padding: "1rem", background: "var(--surface-raised)" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0 0 0.5rem" }}>With Abraxas</h3>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
          Verify once through Abraxas. Partners receive only what policy permits — backed by a signed receipt.
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, margin: "0 0 0.35rem" }}>Shared with partner</p>
        <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {detail.shares.map(item => <li key={item}>{item}</li>)}
        </ul>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, margin: "0 0 0.35rem" }}>Stays private</p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {detail.never.map(item => <li key={item}>{item}</li>)}
        </ul>
        {detail.note ? (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>{detail.note}</p>
        ) : null}
      </article>
    </div>
  );
}
