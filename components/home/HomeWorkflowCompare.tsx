"use client";
// FILE: components/home/HomeWorkflowCompare.tsx
// Remove the imagination gap — show current vs Abraxas workflow.

import { WORKFLOW_AFTER, WORKFLOW_BEFORE } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const RED = "#F87171";

export function HomeWorkflowCompare() {
  return (
    <section id="workflow" aria-labelledby="workflow-heading" style={{
      padding: "clamp(1.5rem, 4vw, 2.25rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }}>
      <p style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, margin: "0 0 0.5rem",
      }}>
        Remove the imagination gap
      </p>
      <h2 id="workflow-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.35rem", maxWidth: 560, lineHeight: 1.15,
      }}>
        Every verification costs money. Reused verification creates liquidity.
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1.25rem",
      }}>
        Same information. Asked again and again. Abraxas makes proof reusable.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1rem",
      }}>
        <WorkflowColumn
          title="Today"
          subtitle="Upload → verify → repeat"
          tone="muted"
          steps={WORKFLOW_BEFORE}
          footer="Documents pile up. Trust doesn't travel."
        />
        <WorkflowColumn
          title="With Abraxas"
          subtitle="Verify once → reuse everywhere"
          tone="accent"
          steps={WORKFLOW_AFTER}
          footer="Partners get yes or no — not your files."
        />
      </div>
    </section>
  );
}

function WorkflowColumn({
  title,
  subtitle,
  tone,
  steps,
  footer,
}: {
  title: string;
  subtitle: string;
  tone: "muted" | "accent";
  steps: string[];
  footer: string;
}) {
  const accent = tone === "accent";
  return (
    <div style={{
      padding: "1.1rem 1.15rem", borderRadius: 16,
      background: accent ? `${ACCENT}08` : "var(--surface-raised)",
      border: `1px solid ${accent ? `${ACCENT}33` : "var(--border-strong)"}`,
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
        {subtitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((step, i) => (
          <div key={step} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14, flexShrink: 0 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", marginTop: 6,
                background: accent ? ACCENT : RED,
                boxShadow: accent ? `0 0 8px ${ACCENT}55` : "none",
              }} />
              {i < steps.length - 1 && (
                <span style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)", marginTop: 4 }} />
              )}
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem",
              color: accent ? "var(--text-primary)" : "var(--text-secondary)",
              lineHeight: 1.55, margin: "0 0 0.65rem", fontWeight: accent && i === 0 ? 700 : 500,
            }}>
              {step}
            </p>
          </div>
        ))}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
        color: accent ? ACCENT : "var(--text-muted)",
        margin: "0.25rem 0 0", lineHeight: 1.5,
      }}>
        {footer}
      </p>
    </div>
  );
}
