"use client";
// FILE: components/compliance/AssuranceDrawer.tsx
// Methodology drawer for asset metrics with assurance taxonomy.

import { useState } from "react";
import { type AssuranceClaim, levelDef } from "@/lib/assuranceTaxonomy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STATUS_COLORS: Record<string, string> = {
  verified: "#10B981",
  attested: "#10B981",
  reviewed: "#3B82F6",
  active: "#8B5CF6",
  reference: "#F59E0B",
  pending: "#6B7280",
};

interface Props {
  claim: AssuranceClaim;
  compact?: boolean;
}

export function AssuranceDrawer({ claim, compact }: Props) {
  const [open, setOpen] = useState(false);
  const def = levelDef(claim.level);
  const statusColor = STATUS_COLORS[claim.status ?? "reference"] ?? "#6B7280";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: compact ? "0.65rem 0.75rem" : "0.75rem",
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
          {claim.label}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span style={{ fontFamily: FONT, fontSize: compact ? "1rem" : "1.1rem", fontWeight: 700, color: claim.level >= 3 ? ACCENT : "var(--text-primary)" }}>
            {claim.value}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.06em",
            padding: "0.2rem 0.45rem", borderRadius: 999,
            background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40`,
          }}>
            {def.shortLabel}
          </span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: ACCENT, marginTop: 4 }}>
          {open ? "Hide methodology ↑" : "How calculated →"}
        </div>
      </button>

      {open && (
        <div style={{
          marginTop: "0.5rem", padding: "0.85rem", borderRadius: 12,
          background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            {def.label}
          </div>
          <p style={{ margin: "0 0 0.65rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {def.definition}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.68rem" }}>
            <tbody>
              {[
                ["Source", claim.source],
                ["As of", claim.asOf],
                ...(claim.expires ? [["Expires", claim.expires]] : []),
                ...(claim.assumptions ? [["Assumptions", claim.assumptions]] : []),
                ["Technical", def.technical],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "0.25rem 0.5rem 0.25rem 0", color: "var(--text-muted)", verticalAlign: "top", width: "30%" }}>{k}</td>
                  <td style={{ padding: "0.25rem 0", color: "var(--text-secondary)", lineHeight: 1.5 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
