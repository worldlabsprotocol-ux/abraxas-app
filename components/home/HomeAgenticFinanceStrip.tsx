"use client";
// FILE: components/home/HomeAgenticFinanceStrip.tsx
// Prominent agentic finance + Robinhood MCP positioning on homepage.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  AGENTIC_FINANCE_HOME_BADGE,
  AGENTIC_FINANCE_HOME_TITLE,
  AGENTIC_FINANCE_INDEPENDENCE_NOTE,
  AGENTIC_FINANCE_STRIP_BODY,
  AGENTIC_FINANCE_STACK_LAYERS,
  ROBINHOOD_AGENTIC_TRADING_REFERENCE,
  ROBINHOOD_TRADING_MCP_URL,
} from "@/lib/agenticFinancePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const CLIENT_CHIPS = ROBINHOOD_AGENTIC_TRADING_REFERENCE.supported_clients.slice(0, 5);

export function HomeAgenticFinanceStrip() {
  return (
    <section
      id="agentic-finance"
      aria-labelledby="agentic-finance-heading"
      style={{
        padding: "clamp(1rem, 3vw, 1.5rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(1rem, 3vw, 1.35rem)",
          borderRadius: 18,
          border: "1px solid rgba(16,185,129,0.45)",
          background:
            "linear-gradient(155deg, rgba(16,185,129,0.12) 0%, rgba(10,8,20,0.35) 45%, var(--surface-raised) 100%)",
          boxShadow: "0 0 48px rgba(16,185,129,0.08)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.65rem" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.58rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#34D399",
              padding: "0.28rem 0.6rem",
              borderRadius: 999,
              border: "1px solid rgba(52,211,153,0.45)",
              background: "rgba(16,185,129,0.14)",
            }}
          >
            {AGENTIC_FINANCE_HOME_BADGE}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.52rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Building with the RWA + agentic stack
          </span>
        </div>

        <h2
          id="agentic-finance-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.15rem, 3.2vw, 1.55rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 0.55rem",
            lineHeight: 1.2,
            maxWidth: 720,
          }}
        >
          {AGENTIC_FINANCE_HOME_TITLE}
        </h2>

        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.82rem, 2vw, 0.92rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1rem",
            maxWidth: 720,
          }}
        >
          {AGENTIC_FINANCE_STRIP_BODY}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem",
            alignItems: "stretch",
          }}
        >
          {AGENTIC_FINANCE_STACK_LAYERS.map((layer, i) => (
            <div key={layer.id} style={{ display: "flex", alignItems: "stretch", gap: "0.5rem" }}>
              {i > 0 && (
                <div
                  aria-hidden
                  style={{
                    display: "none",
                    fontFamily: MONO,
                    fontSize: "1.25rem",
                    color: "var(--accent)",
                    alignSelf: "center",
                  }}
                  className="abx-agentic-arrow"
                >
                  →
                </div>
              )}
              <div
                style={{
                  flex: 1,
                  padding: "0.75rem 0.85rem",
                  borderRadius: 12,
                  border: layer.abraxas
                    ? "1px solid rgba(16,185,129,0.5)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: layer.abraxas ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {layer.label}
                </div>
                <p
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.76rem",
                    color: "var(--text-secondary)",
                    margin: "0.35rem 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {layer.role}
                </p>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.58rem",
                    color: "var(--text-muted)",
                    margin: "0.4rem 0 0",
                    lineHeight: 1.45,
                    wordBreak: "break-all",
                  }}
                >
                  {layer.examples}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem",
            marginBottom: "0.75rem",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "0.25rem" }}>
            Robinhood MCP works with:
          </span>
          {CLIENT_CHIPS.map(client => (
            <span
              key={client}
              style={{
                fontFamily: FONT,
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                padding: "0.2rem 0.45rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              {client}
            </span>
          ))}
        </div>

        <div
          style={{
            padding: "0.55rem 0.7rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.2)",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Robinhood Trading MCP endpoint ·{" "}
          </span>
          <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: "#34D399" }}>{ROBINHOOD_TRADING_MCP_URL}</code>
        </div>

        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
            margin: "0 0 0.85rem",
            maxWidth: 720,
          }}
        >
          {AGENTIC_FINANCE_INDEPENDENCE_NOTE}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <Btn href="/docs/ai-agents" size="lg">
            AI agent integration guide →
          </Btn>
          <Btn href="/api/docs/agents" variant="secondary" size="lg">
            JSON for agents →
          </Btn>
          <Link
            href="/integrate"
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Integrate overview →
          </Link>
        </div>
      </div>
    </section>
  );
}
