"use client";
// FILE: components/roadmap/TimelineFramingPanel.tsx

import { useState } from "react";
import { TIMELINE_DISCLAIMER, TIMELINE_FRAMINGS, type TimelineVariant } from "@/lib/roadmapTimeline";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function TimelineFramingPanel() {
  const [variant, setVariant] = useState<TimelineVariant>("conservative");
  const active = TIMELINE_FRAMINGS.find(f => f.id === variant) ?? TIMELINE_FRAMINGS[0];

  return (
    <section id="timeline-framing" aria-labelledby="timeline-framing-heading">
      <div
        className="abx-glass-panel"
        style={{
          marginBottom: "1.25rem",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.4rem" }}>
          Public positioning · no calendar dates
        </div>
        <h2
          id="timeline-framing-heading"
          style={{
            fontFamily: FONT,
            fontSize: "var(--fs-h2)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 0.5rem",
          }}
        >
          How to talk about mainnet timing
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 680 }}>
          {TIMELINE_DISCLAIMER}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
          {TIMELINE_FRAMINGS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setVariant(f.id)}
              aria-pressed={variant === f.id}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 999,
                border: variant === f.id ? "1px solid rgba(232,197,71,0.5)" : "1px solid var(--border)",
                background: variant === f.id ? "rgba(232,197,71,0.12)" : "var(--surface)",
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: variant === f.id ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "1rem 1.1rem",
            borderRadius: 14,
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.45rem", lineHeight: 1.35 }}>
            {active.headline}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
            {active.body}
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
            {active.bullets.map(b => (
              <li key={b} style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 6 }}>
                {b}
              </li>
            ))}
          </ul>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Best for: {active.whenToUse}
          </div>
        </div>
      </div>
    </section>
  );
}
