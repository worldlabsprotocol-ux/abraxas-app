"use client";
// FILE: components/operators/OperatorRoiCalculator.tsx
// Interactive ROI — ties software to measurable economics.

import { useMemo, useState } from "react";
import { computeOperatorRoi } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function OperatorRoiCalculator() {
  const [verifications, setVerifications] = useState(500);
  const [minutes, setMinutes] = useState(12);
  const [hourly, setHourly] = useState(30);

  const roi = useMemo(
    () => computeOperatorRoi({
      verificationsPerMonth: verifications,
      minutesPerVerification: minutes,
      hourlyLaborUsd: hourly,
    }),
    [verifications, minutes, hourly],
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontFamily: FONT, fontSize: "16px",
    boxSizing: "border-box",
  };

  return (
    <div id="roi-calculator" style={{
      padding: "1.25rem", borderRadius: 16,
      border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
      scrollMarginTop: 96,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.35rem",
      }}>
        ROI calculator
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.6, margin: "0 0 1rem", maxWidth: 480,
      }}>
        Model hours saved when proof is reused instead of re-collected. Assumes ~75% review time reduction and ~80% fewer duplicate uploads (pilot targets).
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}>
        <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
          Verifications / month
          <input type="number" min={1} value={verifications}
            onChange={e => setVerifications(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle, marginTop: 4 }} />
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
          Minutes each (today)
          <input type="number" min={1} value={minutes}
            onChange={e => setMinutes(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle, marginTop: 4 }} />
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
          Labor rate ($/hr)
          <input type="number" min={1} value={hourly}
            onChange={e => setHourly(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle, marginTop: 4 }} />
        </label>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.65rem",
      }}>
        {[
          { label: "Hours saved / mo", value: Math.round(roi.hoursSaved).toLocaleString() },
          { label: "Labor saved / mo", value: `$${roi.laborSavedUsd.toLocaleString()}` },
          { label: "Docs avoided / mo", value: roi.documentsAvoided.toLocaleString() },
          { label: "Hours after Abraxas", value: Math.round(roi.hoursAfter).toLocaleString() },
        ].map(row => (
          <div key={row.label} style={{
            padding: "0.75rem", borderRadius: 12,
            border: `1px solid ${ACCENT}33`, background: `${ACCENT}08`,
          }}>
            <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 900, color: ACCENT }}>
              {row.value}
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginTop: 4 }}>
              {row.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
