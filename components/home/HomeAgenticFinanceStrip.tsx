"use client";
// FILE: components/home/HomeAgenticFinanceStrip.tsx
// Agentic finance — elite visual slideshow, minimal copy.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { AGENTIC_ELITE_DEMO } from "@/lib/eliteDemoSlides";
import { AGENTIC_FINANCE_HOME_TITLE, ROBINHOOD_TRADING_MCP_URL } from "@/lib/agenticFinancePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeAgenticFinanceStrip() {
  return (
    <section
      id="agentic-finance"
      aria-labelledby="agentic-finance-heading"
      style={{
        padding: "clamp(1rem, 2.5vw, 1.5rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead
        eyebrow="Agentic finance · July 2026"
        title={<span id="agentic-finance-heading">{AGENTIC_FINANCE_HOME_TITLE}</span>}
        headingId="agentic-finance-heading"
      />

      <EliteConceptDemo config={AGENTIC_ELITE_DEMO} id="agentic-demo" compact />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center", marginTop: "0.5rem" }}>
        <Btn href="/docs/ai-agents" size="sm">AI agents →</Btn>
        <Btn href="/api/docs/agents" variant="secondary" size="sm">JSON →</Btn>
        <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
          Integrate →
        </Link>
        <code style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          {ROBINHOOD_TRADING_MCP_URL.replace("https://", "")}
        </code>
      </div>
    </section>
  );
}
