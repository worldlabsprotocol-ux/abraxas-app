"use client";
// FILE: app/docs/ai-agents/page.tsx
// Abraxas for AI agents. verify → proof → independent check.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  AGENT_FLOW_STEPS,
  AGENT_ONE_PAGER,
  AGENT_POSITIONING_LONG,
  AGENT_POSITIONING_SHORT,
  getAgentVerificationGuide,
} from "@/lib/agentVerification";
import {
  AGENTIC_FINANCE_COMPOSE_FLOW,
  AGENTIC_FINANCE_INDEPENDENCE_NOTE,
  AGENTIC_FINANCE_SUBHEAD,
  ROBINHOOD_AGENTIC_TRADING_REFERENCE,
  getAgenticFinanceStack,
} from "@/lib/agenticFinancePositioning";
import { MINIMAL_RP_INTEGRATION_EXAMPLE } from "@/lib/externalRelyingPartyIntegration";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const guide = getAgentVerificationGuide();
const agenticStack = getAgenticFinanceStack();

export default function AiAgentsDocsPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="AI agents"
        title={AGENT_ONE_PAGER.title}
        subtitle={AGENT_POSITIONING_SHORT}
      />

      <ContentCard title="Agentic finance stack">
        <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }}>{AGENTIC_FINANCE_SUBHEAD}</p>
        <p style={{ ...body, marginTop: "0.65rem" }}>{AGENTIC_FINANCE_INDEPENDENCE_NOTE}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", margin: "0.85rem 0" }}>
          {agenticStack.stack.map(layer => (
            <div
              key={layer.id}
              style={{
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: layer.abraxas ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border)",
                background: layer.abraxas ? "rgba(16,185,129,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {layer.label}
              </div>
              <p style={{ ...body, fontSize: "0.78rem", marginTop: "0.35rem" }}>{layer.role}</p>
              <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                {layer.examples}
              </p>
            </div>
          ))}
        </div>
        <BulletList items={[...AGENTIC_FINANCE_COMPOSE_FLOW]} />
        <p style={{ ...body, marginTop: "0.65rem", fontSize: "0.78rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>Robinhood reference (act layer).</strong>{" "}
          Their Trading MCP is at{" "}
          <code style={inlineCode}>{ROBINHOOD_AGENTIC_TRADING_REFERENCE.mcp_url}</code>
          {" "},  OAuth, isolated Agentic account, equities and rolling options support per their docs.{" "}
          Abraxas does not operate that server; compose verify → act in your agent policy.
        </p>
      </ContentCard>

      <ContentCard title="Design principle">
        <p style={body}>{AGENT_ONE_PAGER.principle}</p>
        <p style={{ ...body, marginTop: "0.65rem" }}>{AGENT_POSITIONING_LONG}</p>
        <p style={{ ...body, marginTop: "0.65rem", fontSize: "0.78rem" }}>{AGENT_ONE_PAGER.mcp_note}</p>
      </ContentCard>

      <ContentCard title="What Abraxas provides">
        <p style={body}>{AGENT_ONE_PAGER.what}</p>
      </ContentCard>

      <ContentCard title="Recommended agent flow">
        <BulletList items={[...AGENT_FLOW_STEPS]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/api/docs/agents" size="sm">JSON guide →</Btn>
          <Btn href="/docs/relying-party-verify" variant="secondary" size="sm">Human developer docs →</Btn>
          <Btn href="/api/proof/reference/ABX-RE-HOSP-001" variant="ghost" size="sm">Live demo →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="What the agent receives">
        <BulletList items={[...AGENT_ONE_PAGER.receives]} />
      </ContentCard>

      <ContentCard title="Agent decision fields">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Every verify and proof response includes an <code style={inlineCode}>agent</code> object with explicit booleans , 
          minimal branching logic, no parsing nested receipts.
        </p>
        <CodeBlock>{JSON.stringify({
          verify: {
            schema: guide.endpoints.verify.agent_schema,
            proceed: true,
            action_allowed: true,
            decision: "approved",
            proof_id: "aprx_…",
            verify_url: "https://…/api/proof/aprx_…",
            next_step: "verify_proof",
          },
          proof: {
            schema: guide.endpoints.proof_lookup.agent_schema,
            valid: true,
            proceed: true,
            signature_valid: true,
            proof_reliable: true,
            next_step: "proceed",
          },
        }, null, 2)}</CodeBlock>
      </ContentCard>

      <ContentCard title="Decision tree">
        <BulletList items={[
          "verify.agent.next_step === \"verify_proof\" → GET verify_url, require proof.agent.valid === true",
          "verify.agent.next_step === \"deny\" → fail closed",
          "verify.agent.next_step === \"manual_review\" → escalate or hold",
          "verify.agent.next_step === \"retry\" → approved but proof missing; retry or fail closed",
          "proof.agent.valid === true → safe to proceed (subject to your policy)",
        ]} />
      </ContentCard>

      <ContentCard title="Example integration">
        <CodeBlock>{MINIMAL_RP_INTEGRATION_EXAMPLE.replace(
          "if (result.decision !== \"approved\") return;",
          "if (!result.agent?.proceed) return; // or check decision + proof separately",
        )}</CodeBlock>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/integrate" size="lg">Integrate overview →</Btn>
        <Btn href="/design-partner" variant="secondary" size="lg">Get API key →</Btn>
        <Link href="/api/docs/agents" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Machine-readable guide →
        </Link>
      </div>
    </RedesignPage>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      fontFamily: MONO, fontSize: "0.62rem", lineHeight: 1.55,
      padding: "1rem", borderRadius: 10, overflow: "auto",
      background: "var(--surface)", border: "1px solid var(--border)",
      color: "var(--text-secondary)", margin: 0,
    }}>
      {children}
    </pre>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};

const inlineCode: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
};
