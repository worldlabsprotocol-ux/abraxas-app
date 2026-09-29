"use client";
// FILE: components/demo/PrivacyMinimizationComparison.tsx

import {
  RELYING_PARTY_PILOT_ABRAXAS_RESPONSE,
  RELYING_PARTY_PILOT_TRADITIONAL_RESPONSE,
} from "@/lib/demo/relyingPartyPilot/contract";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PrivacyMinimizationComparison({ sampleResult }: { sampleResult?: Record<string, unknown> | null }) {
  return (
    <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>{RELYING_PARTY_PILOT_TRADITIONAL_RESPONSE.label}</h3>
        <p style={bodyStyle}>Application receives identity data / documents:</p>
        <ul style={listStyle}>
          {RELYING_PARTY_PILOT_TRADITIONAL_RESPONSE.receives.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div style={panelStyle}>
        <h3 style={titleStyle}>{RELYING_PARTY_PILOT_ABRAXAS_RESPONSE.label}</h3>
        <p style={bodyStyle}>Application receives:</p>
        <ul style={listStyle}>
          {RELYING_PARTY_PILOT_ABRAXAS_RESPONSE.receives.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {sampleResult && (
          <pre style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            lineHeight: 1.55,
            padding: "0.65rem",
            borderRadius: 8,
            background: "var(--surface-inset)",
            border: "1px solid var(--border)",
            overflow: "auto",
            margin: "0.65rem 0 0",
          }}
          >
            {JSON.stringify(sampleResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.85rem 0.95rem",
  background: "var(--surface)",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 0.35rem",
  fontFamily: FONT,
  fontSize: "0.82rem",
  fontWeight: 800,
  color: "var(--text-primary)",
};

const bodyStyle: React.CSSProperties = {
  margin: "0 0 0.45rem",
  fontFamily: FONT,
  fontSize: "0.74rem",
  color: "var(--text-secondary)",
  lineHeight: 1.55,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "1.1rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  color: "var(--text-secondary)",
  display: "grid",
  gap: "0.25rem",
};
