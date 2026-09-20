"use client";
// FILE: components/partner/HolderRequestBriefCard.tsx
// Requestor, purpose, result, withheld, environment. No return URLs or IDs.

import type { CSSProperties } from "react";
import type { HolderRequestBrief } from "@/lib/partner/holderExperience";

const wrap: CSSProperties = {
  margin: "0 0 1rem",
  padding: "0.85rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
};

const label: CSSProperties = {
  margin: "0 0 0.2rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted, #9ca3af)",
};

const value: CSSProperties = {
  margin: "0 0 0.7rem",
  fontSize: "0.8rem",
  lineHeight: 1.55,
  color: "var(--text-secondary, #d1d5db)",
};

export function HolderRequestBriefCard({ brief }: { brief: HolderRequestBrief }) {
  return (
    <section aria-labelledby="holder-request-brief-heading" style={wrap}>
      <h2
        id="holder-request-brief-heading"
        style={{ margin: "0 0 0.65rem", fontSize: "0.92rem", fontWeight: 800 }}
      >
        What this request covers
      </h2>
      <p style={label}>Who is requesting</p>
      <p style={value}>{brief.requestor}</p>
      <p style={label}>Purpose</p>
      <p style={value}>{brief.purpose}</p>
      <p style={label}>Result shared</p>
      <p style={value}>{brief.result}</p>
      <p style={label}>Withheld</p>
      <ul style={{ ...value, margin: "0 0 0.7rem", paddingLeft: "1.1rem" }}>
        {brief.withheld.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p style={label}>Environment</p>
      <p style={{ ...value, marginBottom: 0 }}>
        <strong>{brief.environment_label}.</strong> {brief.environment_detail}
      </p>
      <p style={{ ...value, margin: "0.65rem 0 0" }}>{brief.google_account_only}</p>
      <p style={{ ...value, margin: "0.4rem 0 0" }}>{brief.identity_not_default}</p>
    </section>
  );
}
