"use client";
// FILE: components/home/HomeAgenticFinanceStrip.tsx
// Agentic finance positioning — verify before act (Robinhood MCP context, no integration claim).

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  AGENTIC_FINANCE_HEADLINE,
  AGENTIC_FINANCE_INDEPENDENCE_NOTE,
  AGENTIC_FINANCE_STRIP_BODY,
  AGENTIC_FINANCE_STACK_LAYERS,
} from "@/lib/agenticFinancePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeAgenticFinanceStrip() {
  return (
    <section
      aria-label="Agentic finance positioning"
      style={{
        padding: "0.75rem 0 0.85rem",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(0.85rem, 2vw, 1rem)",
          borderRadius: 14,
          border: "1px solid rgba(16,185,129,0.32)",
          background: "linear-gradient(135deg, rgba(16,185,129,0.07) 0%, var(--surface-raised) 100%)",
        }}
      >
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 0.4rem",
          }}
        >
          Agentic finance · building with the stack
        </p>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 0.45rem",
            lineHeight: 1.35,
          }}
        >
          {AGENTIC_FINANCE_HEADLINE}
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem", maxWidth: 680 }}>
          {AGENTIC_FINANCE_STRIP_BODY}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "0.45rem",
            marginBottom: "0.65rem",
          }}
        >
          {AGENTIC_FINANCE_STACK_LAYERS.map(layer => (
            <div
              key={layer.id}
              style={{
                padding: "0.55rem 0.65rem",
                borderRadius: 10,
                border: layer.abraxas ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border)",
                background: layer.abraxas ? "rgba(16,185,129,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {layer.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.45 }}>
                {layer.role}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 0.6rem", maxWidth: 680 }}>
          {AGENTIC_FINANCE_INDEPENDENCE_NOTE}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
          <Btn href="/docs/ai-agents" size="sm">Agent integration guide →</Btn>
          <Btn href="/api/docs/agents" variant="secondary" size="sm">JSON for agents →</Btn>
          <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            Integrate overview →
          </Link>
        </div>
      </div>
    </section>
  );
}
