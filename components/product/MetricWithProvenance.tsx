"use client";
// FILE: components/product/MetricWithProvenance.tsx

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export type MetricProvenance = "measured" | "derived" | "operator_asserted" | "customer_reported" | "unavailable";

export function MetricWithProvenance({
  label,
  value,
  provenance,
  sampleNote,
  unavailableReason,
}: {
  label: string;
  value: string | number | null;
  provenance: MetricProvenance;
  sampleNote?: string;
  unavailableReason?: string;
}) {
  const display = value == null ? "Unavailable" : String(value);
  const isUnavailable = value == null;

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
        padding: "0.75rem 0.85rem",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0 0 0.25rem", color: isUnavailable ? "var(--text-muted)" : "var(--text-primary)" }}>
        {display}
      </p>
      <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>
        {provenance.replace(/_/g, " ")}
        {sampleNote ? ` · ${sampleNote}` : ""}
      </p>
      {isUnavailable && unavailableReason && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
          {unavailableReason}
        </p>
      )}
    </div>
  );
}
