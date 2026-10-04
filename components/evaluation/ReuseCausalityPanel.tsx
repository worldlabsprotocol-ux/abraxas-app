"use client";
// FILE: components/evaluation/ReuseCausalityPanel.tsx
// The Abraxas moment — causality from one verification to two app-bound results.

import { useReducedMotion } from "framer-motion";
import { reuseCausalityHeadline } from "@/lib/partner/twoAppEvaluation/evaluationUx";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

function FlowNode({ label, sub, accent }: { label: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "0.65rem 0.75rem",
        borderRadius: 10,
        border: `1px solid ${accent ? "rgba(45,212,191,0.45)" : "var(--border)"}`,
        background: accent ? "rgba(45,212,191,0.08)" : "var(--surface-inset)",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>
        {label}
      </div>
      {sub && (
        <div style={{ ...body, fontSize: "0.72rem", marginTop: "0.2rem", color: "var(--text-muted)" }}>{sub}</div>
      )}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.15rem 0",
        color: "var(--text-muted)",
        fontFamily: MONO,
        fontSize: "0.72rem",
        fontWeight: 700,
        minWidth: "1.5rem",
      }}
    >
      <span>↓</span>
      {label && <span style={{ fontSize: "0.62rem", marginTop: "0.15rem", textAlign: "center" }}>{label}</span>}
    </div>
  );
}

export function ReuseCausalityPanel({
  appAName,
  appBName,
  metrics,
}: {
  appAName: string;
  appBName: string;
  metrics: {
    underlying_verification_events: number | null;
    applications_with_verified_results: number;
    additional_raw_kyc_recollections: number | null;
  };
}) {
  const reduceMotion = useReducedMotion();
  const headline = reuseCausalityHeadline(metrics);

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <p style={{ ...body, fontWeight: 700, color: "#2DD4BF", margin: 0 }}>{headline}</p>
      <p style={body}>
        The same trusted verification evidence was checked against each application&apos;s policy. Each app received its
        own bound result — App B did not receive App A&apos;s result, and no raw identity package was shared again.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "0.15rem",
          maxWidth: 420,
          margin: "0 auto",
          width: "100%",
        }}
        aria-label="Verification to reuse causality"
      >
        <FlowNode label="One holder verification" sub="Trusted evidence recorded once" accent />
        <FlowArrow label="same evidence" />
        <FlowNode label={appAName} sub="Application A result" />
        <FlowArrow label="policy check" />
        <FlowNode label={appBName} sub="Application B result (distinct)" accent />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          gap: "0.55rem",
        }}
        aria-label="Observed reuse metrics"
      >
        {[
          ["Underlying verification events", metrics.underlying_verification_events ?? "—"],
          ["Applications with verified results", metrics.applications_with_verified_results],
          ["Additional raw KYC recollections", metrics.additional_raw_kyc_recollections ?? "—"],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              padding: "0.75rem",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface-inset)",
              transition: reduceMotion ? undefined : "border-color 0.35s ease, background 0.35s ease",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "1.05rem", fontWeight: 800, color: "var(--accent)" }}>
              {value}
            </div>
            <div style={{ ...body, fontSize: "0.72rem", marginTop: "0.2rem" }}>{label}</div>
          </div>
        ))}
      </div>

      <p style={{ ...body, fontSize: "0.72rem", color: "var(--text-muted)" }}>
        Observed in your sandbox evaluation — not reference harness numbers.
      </p>
    </div>
  );
}
